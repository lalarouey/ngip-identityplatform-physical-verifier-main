import { VerifiableCredential } from '@veramo/core';
import { Request, Response } from 'express';
import { Socket } from 'socket.io';
import { TCidRow, TSchema } from 'types.js';
import { issueCredentialWithSchema } from '../credentials.js';
import { resolveDIDCommMessage, sendDIDCommMessage } from '../didcomm.js';
import {
  getPrivateJSONObject,
  uploadPrivateJSONObject,
} from '../ipfs/privatePinataAPI.js';
import { execute, fetchFirst } from '../ipfsRegister.js';
import { getSchema } from '../schemaRegistry.js';
import { hashIdentityObject } from '../utils.js';
import { agent, db } from './server.js';

async function requestCredentialWithSchema(
  socket: Socket,
  issuerDID: string,
  did: string,
  schemaName: string,
  data: {
    [key: string]: any;
  },
) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] VC requested...`);
  try {
    await validateRequest(issuerDID, schemaName, data);
    const VC = await issueCredentialWithSchema(did, data, 86400, schemaName);

    await sendDIDCommMessage(
      issuerDID,
      did,
      VC.credential,
      'receiveCredential',
      'authcrypt',
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${timestamp}] Error handling VC Request:`, errorMessage);
    socket.emit('custom-error', {
      title: 'Failed to issue credential',
      errorMessage,
    });
  }
}

/**
 * Create and bind a hashed identity to a holder DID
 * @param holderDID DID of the credential holder
 * @param realWorldIdentity Object containing real-world identity data
 */
export async function issueCredentialBindingVC(
  socket: Socket,
  holderDID: string,
  realWorldIdentity: Record<string, any>,
  schemaName: string,
): Promise<void> {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Issuing Credential Binding VC...`);

  try {
    const issuerDID = (await agent.didManagerGetByAlias({ alias: 'default' }))
      .did;
    // 1. Hash the identity
    const identityHash = hashIdentityObject(realWorldIdentity);

    // 2. Issue the Identity VC (not shared with holder, just for encrypted storage)
    const { credential: identityVC } = await issueCredentialWithSchema(
      holderDID,
      realWorldIdentity,
      365 * 24 * 60 * 60, // 1 year
      schemaName,
    );

    // 3. Upload encrypted VC to IPFS
    const encryptedIdentityCID = await uploadVC(identityVC);

    // 4. Issue the CredentialBinding VC with the identity hash
    const { credential: credentialBindingVC } = await issueCredentialWithSchema(
      holderDID,
      {
        identityHash,
        encryptedCID: encryptedIdentityCID,
      },
      365 * 24 * 60 * 60, // 1 year
      'CredentialBinding',
    );

    // 5. Store the bindingVC ID in the database
    await execute(db, `UPDATE cids SET bindingVCID = ? WHERE vcID = ?`, [
      credentialBindingVC.id,
      identityVC.id,
    ]);

    await sendDIDCommMessage(
      issuerDID,
      holderDID,
      credentialBindingVC,
      'receiveCredential',
      'authcrypt',
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.log(
      `Failed to issue CredentialBinding and IdentityCredential: ${errorMessage}`,
    );
    socket.emit('custom-error', {
      title: 'Failed to issue CredentialBinding and IdentityCredential',
      errorMessage,
    });
  }
}

/**
 * Retrieves and verifies identity data from a CredentialBinding VC by its ID
 * @param socket socket to emit identity to
 * @param vcID ID of the CredentialBinding VC
 */
export async function retrieveIdentityByVCID(
  socket: Socket,
  vcID: string,
): Promise<void> {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Retrieving identity from VC ID: ${vcID}`);

  try {
    // 1. Get CID from local DB
    const row = (await fetchFirst(
      db,
      `SELECT * FROM cids WHERE bindingVCID = ?`,
      [vcID],
    )) as TCidRow;

    db.all('SELECT * FROM cids', [], (err, rows) => {
      if (err) console.error('Error querying cids:', err);
      else console.log('Current CID rows:', rows);
    });

    if (!row || !row.cid) {
      throw new Error(`No CID found for VC ID: ${vcID}`);
    }

    // 2. Retrieve and decrypt VC
    const encryptedData = await getPrivateJSONObject(row.cid);
    if (!encryptedData.encryptedCredential) {
      throw new Error('Missing encryptedCredential in IPFS object');
    }

    const did = await agent.didManagerGetByAlias({ alias: 'default' });
    const encKey = did.keys.find(k => k.type === 'X25519');
    if (!encKey) {
      throw new Error('No X25519 encryption key found for DID');
    }

    const decrypted = await agent.keyManagerDecryptJWE({
      kid: encKey.kid,
      data: JSON.parse(encryptedData.encryptedCredential),
    });

    const decryptedCredential = JSON.parse(decrypted);
    const identityData = decryptedCredential.credentialSubject;
    const storedHash = decryptedCredential.credentialSubject.identityHash;

    // 3. Validate identity hash
    const computedHash = hashIdentityObject(identityData);
    if (storedHash && storedHash !== computedHash) {
      throw new Error(
        `Identity hash mismatch — computed: ${computedHash}, stored: ${storedHash}`,
      );
    }

    // 4. Success
    console.log(`[${timestamp}] Identity successfully verified`);
    socket.emit('identity-retrieved', identityData);
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Unknown error retrieving identity';
    console.error(`[${timestamp}] Error: ${errorMessage}`);
    socket.emit('identity-retrieve-error', { vcID, error: errorMessage });
  }
}

/**
 * Function to send a challenge to the DID owner
 * @param socket socket to sent the response to
 * @param issuerDID the issuer DID
 * @param did the DID to challenge ownership for
 * @param didToSocketMap map of DIDs to sockets for challenge-response
 * @example
 * challengeOwnership(socket, 'did:ethr:0x123abc', 'did:ethr:0x456def', didToSocketMap);
 */
export async function challengeOwnership(
  socket: Socket,
  issuerDID: string,
  did: string,
  didToSocketMap: Map<
    string,
    { socket: Socket; timeout: NodeJS.Timeout; challenge: string }
  >,
) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Verifying ownership for DID: ${did}`);

  try {
    // Clear existing timeout if the DID already exists
    if (didToSocketMap.has(did)) {
      clearTimeout(didToSocketMap.get(did)!.timeout);
    }

    const challenge = `The quick brown fox jumps over the lazy dog`;

    // Set a timeout for ownership verification
    const timeout = setTimeout(
      () => handleTimeout(did, didToSocketMap),
      5 * 60 * 1000,
    ); // 5 minutes

    // Store the socket, timeout, and challenge in the map
    didToSocketMap.set(did, { socket, timeout, challenge });

    // Send the challenge message
    await sendDIDCommMessage(
      issuerDID,
      did,
      { challenge },
      'verifyOwnership',
      'authcrypt',
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Unknown Error verifying ownership';
    console.error(`[${timestamp}] Error verifying ownership:`, error);
    didToSocketMap.delete(did); // Clean up on error
    socket.emit('custom-error', {
      title: `Failed to send ownership challenge for ${did}`,
      errorMessage,
    });
  }
}

// Helper function to handle timeout
function handleTimeout(
  did: string,
  didToSocketMap: Map<
    string,
    { socket: Socket; timeout: NodeJS.Timeout; challenge: string }
  >,
) {
  const timestamp = new Date().toISOString();
  console.log(
    `[${timestamp}] Ownership verification timed out for DID: ${did}`,
  );

  const entry = didToSocketMap.get(did);
  if (entry) {
    entry.socket.emit('custom-error', {
      title: `Failed to send ownership challenge for ${did}`,
      errorMessage: 'Ownership verification timed out',
    });
    didToSocketMap.delete(did);
  }
}

/**
 * Function to handle ownership verification response
 * @param req Request object
 * @param res Response object
 * @param didToSocketMap Map of DIDs to sockets for challenge-response
 */
export async function ownershipVerification(
  req: Request,
  res: Response,
  didToSocketMap: Map<
    string,
    { socket: Socket; timeout: NodeJS.Timeout; challenge: string }
  >,
) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Ownership verification request received...`);

  try {
    const { senderDID, challenge, response } = await extractVerificationData(
      req.body,
    );

    const entry = didToSocketMap.get(senderDID);
    if (!entry) {
      console.error(
        `[${timestamp}] No active socket found for DID: ${senderDID}`,
      );
      return res
        .status(400)
        .send('No active socket found for the provided DID');
    }

    if (challenge !== entry.challenge) {
      return res.status(400).send('Invalid challenge response');
    }

    clearTimeout(entry.timeout);
    entry.socket.emit('challenge-response', senderDID, response);
    didToSocketMap.delete(senderDID); // Clean up after sending response

    res.status(200).send('Ownership verification successful');
  } catch (error) {
    console.error(
      `[${timestamp}] Error handling ownership verification:`,
      error,
    );
    const errorMessage =
      error instanceof Error ? error.message : 'Invalid message format';
    res.status(400).send(errorMessage);
  }
}

// Helper function to extract and validate verification data
async function extractVerificationData(body: any) {
  const unpackedMessage = await resolveDIDCommMessage(body);
  const { challenge, response } = unpackedMessage.message.body;
  const senderDID = unpackedMessage.message.from;

  if (!senderDID || !challenge || response === undefined) {
    throw new Error('Invalid message format');
  }

  return { senderDID, challenge, response };
}

/**
 * Function to validate the schema and data
 * @param issuerDID DID of the issuer
 * @param schemaName Name of the schema
 * @param data Data to validate
 */
async function validateSchema(
  issuerDID: string,
  schemaName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>,
): Promise<boolean> {
  // Find the schema based on schemaName
  const schema = (await getSchema(issuerDID, schemaName)) as TSchema;
  if (!schema) {
    console.error(`Schema "${schemaName}" not found`);
    return false;
  }

  // Validate data fields
  for (const { fieldName, type } of schema.schemaFields) {
    if (!(fieldName in data)) {
      console.error(`Missing required field: ${fieldName}`);
      return false;
    }
    if (typeof data[fieldName] !== type) {
      console.error(
        `Field "${fieldName}" should be of type "${type}", but got "${typeof data[
          fieldName
        ]}"`,
      );
      return false;
    }
  }
  return true;
}

/**
 * Function to validate the request object and send an error if invalid
 * @param req request object with DID, values and schemaType
 * @param res response object to send the credential or error
 * @param issuerDID the issuer DID
 */
async function validateRequest(
  issuerDID: string,
  schemaName: string,
  data: {
    [key: string]: any;
  },
): Promise<boolean> {
  if (!issuerDID || typeof issuerDID !== 'string') {
    throw Error('Invalid issuer DID provided');
  }

  if (!schemaName || typeof schemaName !== 'string') {
    throw Error('Invalid schema name provided');
  }

  if (!data || typeof data !== 'object') {
    throw Error('Invalid data provided');
  }

  const validatedSchema = await validateSchema(issuerDID, schemaName, data);
  if (!validatedSchema) {
    throw Error('Invalid schema or data provided');
  }

  return true;
}

/**
 * Function to upload a verifiable credential to IPFS and store its CID in the database
 * @param credential The verifiable credential to upload
 * @returns a promise that resolves to the CID of the uploaded credential
 */
async function uploadVC(credential: VerifiableCredential) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Uploading VC to IPFS...`);
  try {
    const vcId = credential.id;
    const did = await agent.didManagerGetByAlias({ alias: 'default' });
    const encKey = did.keys.find(key => key.type === 'X25519');

    if (!encKey) {
      throw new Error('X25519 encryption key not found for DID');
    }

    // Encrypt the VC
    const encrypted = await agent.keyManagerEncryptJWE({
      data: JSON.stringify(credential),
      kid: encKey.kid,
      to: encKey,
    });

    // Upload to IPFS
    const uploadResponse = await uploadPrivateJSONObject({
      id: vcId,
      encryptedCredential: JSON.stringify(encrypted),
    });

    const cid = uploadResponse?.cid;
    if (!cid) {
      throw new Error('Failed to upload VC to IPFS');
    }

    await execute(db, `INSERT OR IGNORE INTO cids (cid) VALUES (?)`, [cid]);
    await execute(db, `UPDATE cids SET docID = ?, vcID = ? WHERE cid = ?`, [
      uploadResponse.id,
      vcId,
      cid,
    ]);

    console.log('VC uploaded to IPFS:', cid);
    return cid;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to upload credential';
    console.error(`[${timestamp}] Error uploading credential:`, error);
    throw new Error(errorMessage);
  }
}
