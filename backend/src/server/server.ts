import cors from 'cors';
import { ethers } from 'ethers';
import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import sqlite3 from 'sqlite3';
import { TSchema } from 'types.js';
import { allowedOrigins, PORT } from '../config.js';
import { execute } from '../ipfsRegister.js';
import {
  challengeOwnership,
  issueCredentialBindingVC,
  ownershipVerification,
  retrieveIdentityByVCID,
} from '../server/VcRequests.js';
import {
  clearDID,
  getEthAddress,
  initializeDID,
  transferFunds,
} from '../utils.js';
import { getAgent } from '../veramo/agents.js';
import { ethSepoliaProvider } from '../veramo/providers.js';
import { handleReport, sendIdentityToIssuer } from './reportRequests.js';
import {
  listSchemasOnSocket,
  registerSchemaOnSocket,
  removeSchemaOnSocket,
} from './schemaRequests.js';

export const agent = await getAgent();
const port = Number(PORT) || 3008;
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

export const db = new sqlite3.Database('./data/IPFS.sqlite');
await execute(
  db,
  `CREATE TABLE IF NOT EXISTS cids (
  cid TEXT PRIMARY KEY,
  vcID TEXT,
  docID TEXT,
  bindingVCID TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`,
  [],
);

app.use(cors());
app.use(express.json());

const verifierSockets = new Set<Socket>();
const identifier = await agent.didManagerGetOrCreate({ alias: 'default' });
const verifierDID = identifier.did;
const ethAddress = await getEthAddress(verifierDID);
const didToSocketMap = new Map<
  string,
  { socket: Socket; timeout: NodeJS.Timeout; challenge: string }
>();

io.on('connection', socket => {
  console.log('Verifier connected:', socket.id);
  verifierSockets.add(socket);

  socket.on('disconnect', () => {
    console.log('Verifier disconnected:', socket.id);
    verifierSockets.delete(socket);
  });

  socket.on('identifier', async () => {
    const balance = ethers.formatEther(
      await ethSepoliaProvider.getBalance(ethAddress),
    );
    socket.emit('identifier-info', verifierDID, ethAddress, balance);
  });

  socket.on('initialize-did', async (did: string) => {
    try {
      await initializeDID(did);
      socket.emit('did-initialized', did);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to clear DID';
      console.error(`[${new Date().toISOString()}] Error clearing DID:`, error);
      socket.emit('custom-error', {
        title: 'Failed to initialize DID',
        errorMessage,
      });
    }
  });

  socket.on('clear-did', async (did: string) => {
    try {
      await clearDID(did);
      socket.emit('did-cleared', did);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to clear DID';
      console.error(`[${new Date().toISOString()}] Error clearing DID:`, error);
      socket.emit('custom-error', {
        title: 'Failed to clear DID',
        errorMessage,
      });
    }
  });

  socket.on('transfer-funds', async (recipient: string) => {
    try {
      console.log(`Transferring funds from ${verifierDID} to ${recipient}...`);
      const receipt = await transferFunds(verifierDID, recipient);
      if (!receipt) {
        socket.emit('custom-error', 'Failed to transfer funds');
        return;
      }
      socket.emit('funds-transferred', recipient);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to transfer funds';
      console.error(
        `[${new Date().toISOString()}] Error transferring funds:`,
        error,
      );
      socket.emit('custom-error', {
        title: 'Failed to transfer funds',
        errorMessage,
      });
    }
  });

  socket.on('register-schema', (schema: TSchema) => {
    registerSchemaOnSocket(socket, schema, verifierDID);
  });

  socket.on('remove-schema', (schemaName: string) => {
    removeSchemaOnSocket(socket, schemaName, verifierDID);
  });

  socket.on('retrieve-schemas', () => {
    listSchemasOnSocket(socket, verifierDID);
  });

  socket.on(
    'issue-credential',
    (
      did: string,
      schemaName: string,
      data: {
        [key: string]: any;
      },
    ) => {
      issueCredentialBindingVC(socket, did, data, schemaName);
    },
  );

  socket.on('verify-ownership', (did: string) => {
    challengeOwnership(socket, verifierDID, did, didToSocketMap);
  });

  socket.on('request-identity', async (bindingVCID: string) => {
    retrieveIdentityByVCID(socket, bindingVCID);
  });

  socket.on(
    'send-identity-to-issuer',
    (issuerDID: string, identity: Record<string, any>) => {
      sendIdentityToIssuer(socket, verifierDID, issuerDID, identity);
    },
  );
});

app.post('/ownership-verification', async (req, res) => {
  ownershipVerification(req, res, didToSocketMap);
});

app.post('/report-abuse', async (req, res) => {
  handleReport(io, req, res);
});

server.listen(port, '0.0.0.0', async () => {
  console.log(`Local agent listening for messages at ${port}`);
});
