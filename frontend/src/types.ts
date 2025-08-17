import { VerifiableCredential } from '@veramo/core';

export type TRegistryVC = {
  issuer: string;
  holder: string;
  ttl: number;
  revoked: boolean;
};

export type TRequestVC = {
  requestId: string;
  did: string;
  data: { [key: string]: any };
};

export type TServiceRequest = {
  requestId: string;
  did: string;
  credential: VerifiableCredential;
};

export type TSchema = {
  schemaName: string;
  schemaFields: [TField, ...TField[]];
};

export type TField = {
  fieldName: string;
  type: 'string' | 'number';
};

export type TCidRow = {
  docId: string;
  vcId: string;
  cid: string;
};

export type TReport = {
  senderDID: string;
  holderDID: string;
  vcID: string;
  description: any;
};
