import 'dotenv/config';
import { PinataSDK, UnpinResponse, GetCIDResponse } from 'pinata-web3';
import { PINATA_GATEWAY_URL, PINATA_JWT } from '../config.js';

const pinata = new PinataSDK({
  pinataJwt: PINATA_JWT,
  pinataGateway: PINATA_GATEWAY_URL,
});

async function uploadPublicJSONObject(jsonString: object) {
  try {
    await pinata.upload.json(jsonString).then(data => {
      console.log(data);
      return data;
    });
  } catch (error) {
    console.log(error);
  }
}

async function getPublicJSONObject(
  cid: string,
): Promise<GetCIDResponse | undefined> {
  try {
    const file = await pinata.gateways.get(cid).then(data => {
      console.log(data);
      return data;
    });
    return file;
  } catch (error) {
    console.log(error);
  }
}

async function deletePublicJSONObject(
  cid: string,
): Promise<UnpinResponse[] | undefined> {
  try {
    const unpin = await pinata.unpin([cid]).then(data => {
      console.log(data);
      return data;
    });
    return unpin;
  } catch (error) {
    console.log(error);
  }
}

export { uploadPublicJSONObject, getPublicJSONObject, deletePublicJSONObject };
