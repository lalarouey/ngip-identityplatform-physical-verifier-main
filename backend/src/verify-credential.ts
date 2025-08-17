import { VerifiableCredential } from '@veramo/core';
import { CREDENTIAL_REVOCATION_REGISTRY_CONTRACT } from './contractReferences.js';
import { agent } from './server/server.js';
import { readContract } from './utils.js';

export async function verifyCredential(credential: VerifiableCredential) {
  try {
    const jwtResult = await agent.verifyCredential({ credential: credential });
    const revocationStatus = !!(await readContract(
      CREDENTIAL_REVOCATION_REGISTRY_CONTRACT,
      'isRevoked',
      [credential.id],
    ));
    if (revocationStatus) {
      throw new Error('Credential is revoked');
    }
    return jwtResult;
  } catch (error) {
    console.error('Error verifying credential:', error);
    throw error;
  }
}
