import 'dotenv/config';
import { PinataSDK, UploadResponse } from 'pinata';
import { PINATA_JWT, PINATA_GATEWAY_URL } from '../config.js';
import { TGetCIDResponse } from 'types.js';

const pinata = new PinataSDK({
  pinataJwt: PINATA_JWT,
  pinataGateway: PINATA_GATEWAY_URL,
});

async function uploadPrivateJSONObject(object: any): Promise<UploadResponse> {
  try {
    const fileName = object.id ? `${object.id}.json` : 'data.json';
    const data = await pinata.upload.json(object, {
      metadata: {
        name: fileName,
      },
    });
    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

async function getPrivateJSONObject(cid: string): Promise<TGetCIDResponse> {
  try {
    const file = await pinata.gateways.get(cid);

    if (!file || typeof file !== 'object') {
      throw new Error('Invalid response structure from IPFS');
    }

    const response = file.data as Partial<TGetCIDResponse>;

    if (
      typeof response.id !== 'string' ||
      typeof response.encryptedCredential !== 'string'
    ) {
      throw new Error('Invalid structure for GetCIDResponse');
    }

    return response as TGetCIDResponse;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

async function deletePrivateJSONObject(documentID: string): Promise<boolean> {
  try {
    const response = await pinata.files.delete([documentID]);

    if (!response || response.length === 0) {
      console.error(`Failed to delete document: ${documentID}`);
      return false;
    }

    console.log(`Successfully deleted document: ${documentID}`);
    return true;
  } catch (error) {
    console.error(`Error deleting document ${documentID} from Pinata:`, error);
    return false;
  }
}

export {
  deletePrivateJSONObject,
  getPrivateJSONObject,
  uploadPrivateJSONObject,
};
