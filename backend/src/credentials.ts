import { CredentialSubject, VerifiableCredential } from '@veramo/core';
import { ethers, TransactionReceipt } from 'ethers';
import { CHAIN_ID, DEFAULT_GAS_LIMIT } from './config.js';
import { CREDENTIAL_REVOCATION_REGISTRY_CONTRACT } from './contractReferences.js';
import { agent } from './server/server.js';
import { connectToContract, getEthAddress, readContract } from './utils.js';

/**
 * Resolve issuer and holder DIDs and create a verifiable credential
 * @param holderDIDUrl DID URL of the holder
 * @param values Values to be included in the credential
 * @param TimeToLive Time to live in seconds
 * @param schemaName Type of schema to be used (optional)
 * @throws Error if the transaction fails or if the holder DID document is null
 * @returns The created credential and transaction response
 */
async function resolveAndCreateCredential(
  holderDIDUrl: string,
  values: CredentialSubject | undefined,
  TimeToLive: number,
  schemaName?: string,
): Promise<{
  credential: VerifiableCredential;
  txResponse: TransactionReceipt;
}> {
  try {
    const IssuerDID = await agent.didManagerGetByAlias({ alias: 'default' });
    const holderDIDDoc = await agent.resolveDid({ didUrl: holderDIDUrl });
    const holderDID = holderDIDDoc.didDocument;
    if (!holderDID) {
      throw new Error('Holder DID document is null');
    }

    const issuanceDate = new Date().toISOString();
    const expirationTimestamp = Math.floor(Date.now() / 1000) + TimeToLive;
    const expirationDate = new Date(expirationTimestamp * 1000).toISOString();

    const credential = await agent.createVerifiableCredential({
      credential: {
        id: `urn:uuid:${crypto.randomUUID()}`,
        ttl: TimeToLive,
        expirationDate,
        issuer: { id: IssuerDID.did },
        credentialSubject: { id: holderDID.id, ...values },
        type: schemaName
          ? ['VerifiableCredential', schemaName]
          : ['VerifiableCredential'],
        issuanceDate,
      },
      proofFormat: 'jwt',
    });

    const publish = await connectToContract(
      IssuerDID.did,
      CREDENTIAL_REVOCATION_REGISTRY_CONTRACT,
      'issueCredential',
      [await getEthAddress(holderDID.id), credential.id, expirationTimestamp],
      0,
      CHAIN_ID,
    );

    if (!publish) {
      throw new Error('Transaction failed');
    }

    return { credential, txResponse: publish };
  } catch (error) {
    console.error('Error in resolveAndCreateCredential:', error);
    throw error;
  }
}

/**
 * Issue a verifiable credential to a holder DID
 * @param holderDIDUrl DID URL of the holder
 * @param values Values to be included in the credential
 * @param TimeToLive Time to live in seconds
 * @returns The issued credential and transaction response
 */
export async function issueCredential(
  holderDIDUrl: string,
  values: CredentialSubject | undefined,
  TimeToLive: number,
): Promise<{
  credential: VerifiableCredential;
  txResponse: TransactionReceipt;
}> {
  return resolveAndCreateCredential(holderDIDUrl, values, TimeToLive);
}

/**
 * Issue a verifiable credential to a holder DID with a schema
 * @param holderDIDUrl DID URL of the holder
 * @param values Values to be included in the credential
 * @param schemaName Type of schema to be used
 * @param TimeToLive Time to live in seconds
 * @returns The issued credential and transaction response
 */
export async function issueCredentialWithSchema(
  holderDIDUrl: string,
  values: CredentialSubject | undefined,
  TimeToLive: number,
  schemaName: string,
): Promise<{
  credential: VerifiableCredential;
  txResponse: TransactionReceipt;
}> {
  return resolveAndCreateCredential(
    holderDIDUrl,
    values,
    TimeToLive,
    schemaName,
  );
}

/**
 * Revoke a verifiable credential
 * @param holderDID DID URL of the holder
 * @param credentialId ID of the credential to be revoked
 * @returns The transaction response if successful
 */
export async function revokeCredential(
  holderDID: string,
  credentialId: string,
): Promise<TransactionReceipt> {
  try {
    const IssuerDID = await agent.didManagerGetByAlias({ alias: 'default' });

    const publish = await connectToContract(
      IssuerDID.did,
      CREDENTIAL_REVOCATION_REGISTRY_CONTRACT,
      'revokeCredential',
      [await getEthAddress(holderDID), credentialId],
      0,
      CHAIN_ID,
    );

    if (!publish) {
      throw new Error('Transaction failed');
    }

    return publish;
  } catch (error) {
    console.error('Error in revokeCredential:', error);
    throw error;
  }
}

/**
 * Revoke a verifiable credential using a signed message and nonce.
 * This allows gas-efficient relayed or delegated revocation.
 *
 * @param holderDIDUrl DID URL of the credential holder
 * @param credentialId ID of the credential to be revoked
 * @returns The transaction receipt if successful
 * @throws Error if signing or transaction fails
 * @example
 * const tx = await revokeCredentialWithSignature('did:ethr:sepolia:0xabc...', 'urn:uuid:1234...');
 */
export async function revokeCredentialWithSignature(
  holderDIDUrl: string,
  credentialId: string,
): Promise<TransactionReceipt> {
  try {
    const issuerDID = await agent.didManagerGetByAlias({ alias: 'default' });
    const issuerEthAddress = await getEthAddress(issuerDID.did);
    const holderEthAddress = await getEthAddress(holderDIDUrl);

    const nonce = await readContract(
      CREDENTIAL_REVOCATION_REGISTRY_CONTRACT,
      'getNonce',
      [issuerEthAddress],
    );

    const hash = ethers.solidityPackedKeccak256(
      ['address', 'uint256', 'address', 'string', 'string'],
      [
        CREDENTIAL_REVOCATION_REGISTRY_CONTRACT.ADDRESS,
        nonce,
        holderEthAddress,
        credentialId,
        'REVOKE',
      ],
    );

    const signedMessage = await agent.keyManagerSign({
      keyRef: issuerDID.keys[0].kid,
      data: hash,
      algorithm: 'eth_signMessage',
      encoding: 'hex',
    });

    const signature = ethers.Signature.from(signedMessage);

    const tx = await connectToContract(
      issuerDID.did,
      CREDENTIAL_REVOCATION_REGISTRY_CONTRACT,
      'revokeCredentialWithSignature',
      [
        holderEthAddress,
        credentialId,
        nonce,
        signature.v,
        signature.r,
        signature.s,
      ],
      0,
      CHAIN_ID,
    );

    if (!tx) {
      throw new Error('Transaction failed');
    }

    return tx;
  } catch (error) {
    console.error('Error in revokeCredentialWithSignature:', error);
    throw error;
  }
}

/**
 * Check if a credential has been revoked
 * @param credentialId ID of the credential
 * @returns True if the credential has been revoked, false otherwise
 */
export async function isCredentialRevoked(
  credentialId: string,
): Promise<boolean> {
  try {
    const result = await readContract(
      CREDENTIAL_REVOCATION_REGISTRY_CONTRACT,
      'isRevoked',
      [credentialId],
    );

    return result;
  } catch (error) {
    console.error('Error in isCredentialRevoked:', error);
    throw error;
  }
}

/**
 * Get all credentials issued to a holder
 * @param holderDIDUrl DID URL of the holder
 * @returns The credentials issued to the holder
 */
export async function getCredentialsForHolder(holderDID: string): Promise<
  {
    vcID: string;
    issuer: string;
    holder: string;
    ttl: number;
    revoked: boolean;
  }[]
> {
  const verifierDID = await agent.didManagerGetByAlias({
    alias: 'default',
  });

  const messageHash = ethers.keccak256(
    ethers.toUtf8Bytes(`Authentication Request for ${holderDID}`),
  );

  const signedMessage = await agent.keyManagerSign({
    keyRef: verifierDID.keys[0].kid,
    data: messageHash,
    algorithm: 'eth_signMessage',
    encoding: 'hex',
  });

  const signature = ethers.Signature.from(signedMessage);

  try {
    const result = await readContract(
      CREDENTIAL_REVOCATION_REGISTRY_CONTRACT,
      'getCredentialsForHolder',
      [
        await getEthAddress(holderDID),
        signature.v,
        signature.r,
        signature.s,
        messageHash,
      ],
    );

    const parsed = JSON.parse(
      JSON.stringify(result, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    );

    if (!Array.isArray(parsed) || parsed.length === 0) {
      console.log(`No credentials found for ${holderDID}`);
      return [];
    }

    return parsed.map((item: any) => ({
      vcID: item[0],
      issuer: item[1],
      holder: item[2],
      ttl: Number(item[3]),
      revoked: item[4],
    }));
  } catch (error: any) {
    if (error.code === 'BAD_DATA') {
      console.warn(
        'Access denied or no credentials available for this signer/holder.',
      );
      return [];
    }
    throw error;
  }
}
