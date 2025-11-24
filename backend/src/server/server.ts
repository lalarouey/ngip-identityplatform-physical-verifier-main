import cors from "cors";
import { ethers } from "ethers";
import express from "express";
import http from "http";
import sqlite3 from "sqlite3";
import { TSchema } from "types.js";
import { allowedOrigins, PORT } from "../config.js";
import { execute } from "../ipfsRegister.js";
import {
  challengeOwnership,
  issueCredentialBindingVC,
  ownershipVerification,
  retrieveIdentityByVCID,
} from "../server/VcRequests.js";
import {
  clearDID,
  getEthAddress,
  initializeDID,
  transferFunds,
} from "../utils.js";
import { getAgent } from "../veramo/agents.js";
import { ethSepoliaProvider } from "../veramo/providers.js";
import {
  listSchemasOnSocket,
  registerSchemaOnSocket,
  removeSchemaOnSocket,
} from "./schemaRequests.js";
import { handleReport, sendIdentityToIssuer } from "./reportRequests.js";
import { Server, Socket } from "socket.io";

export const agent = await getAgent({
  didProviderConfigs: [
    {
      method: "ethr",
      name: "did:ethr:sepolia",
      network: "sepolia",
      registry: "0x03d5003bf0e79C5F5223588F347ebA39AfbC3818",
      chainId: 11155111,
      provider: ethSepoliaProvider,
    },
    { method: "web", name: "did:web" },
  ],
});

const app = express();
const server = http.createServer(app);
const port = Number(PORT) || 3008;
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

export const db = new sqlite3.Database("./data/IPFS.sqlite");
await execute(
  db,
  `CREATE TABLE IF NOT EXISTS cids (
    cid TEXT PRIMARY KEY,
    vcID TEXT,
    docID TEXT,
    bindingVCID TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  []
);

// ---------- Setup DIDs ----------
const ethIdentifier = await agent.didManagerGetOrCreate({
  alias: "default",
  provider: "did:ethr:sepolia",
});
console.log("Verifier ETH Identifier: ", ethIdentifier);
const sender = await agent.didManagerGet({ did: ethIdentifier.did });
console.log("sender", sender);
const webIdentifier = await agent.didManagerGetOrCreate({
  alias: "example.com",
  provider: "did:web",
});
const verifierDIDs = [ethIdentifier.did, webIdentifier.did];
const ethAddress = await getEthAddress(ethIdentifier.did);

console.log("Verifier DIDs:", verifierDIDs);
console.log("DID Document:", JSON.stringify(webIdentifier, null, 2));

const didToSocketMap = new Map<
  string,
  { socket: Socket | null; timeout: NodeJS.Timeout; challenge: string }
>();

io.on("connection", (socket) => {
  console.log("New socket connection:", socket.id);

  socket.on("register-did", (did) => {
    console.log("Registered DID:", did);
    didToSocketMap.set(did, {
      socket,
      timeout: setTimeout(() => {}, 0),
      challenge: "",
    });
  });

  socket.on("disconnect", () => {
    for (const [did, entry] of didToSocketMap.entries()) {
      if (entry.socket && entry.socket.id === socket.id) {
        didToSocketMap.delete(did);
        console.log(`DID ${did} disconnected.`);
      }
    }
  });
});

// ---------- ROUTES ----------

app.get("/identifier-info", async (req, res) => {
  const balance = ethers.formatEther(
    await ethSepoliaProvider.getBalance(ethAddress)
  );
  res.json({ verifierDIDs, ethAddress, balance });
});

app.post("/initialize-did", async (req, res) => {
  const { did } = req.body;
  try {
    await initializeDID(did);
    res.json({ message: `DID ${did} initialized successfully` });
  } catch (error) {
    console.error("Error initializing DID:", error);
    res.status(500).json({ error: "Failed to initialize DID" });
  }
});

app.post("/clear-did", async (req, res) => {
  const { did } = req.body;
  try {
    await clearDID(did);
    res.json({ message: `DID ${did} cleared successfully` });
  } catch (error) {
    console.error("Error clearing DID:", error);
    res.status(500).json({ error: "Failed to clear DID" });
  }
});

app.post("/transfer-funds", async (req, res) => {
  const { recipient, verifierDID } = req.body;
  try {
    console.log(`Transferring funds from ${verifierDID} to ${recipient}`);
    const receipt = await transferFunds(verifierDID, recipient);
    if (!receipt) throw new Error("Transfer failed");
    res.json({ message: `Funds transferred to ${recipient}`, receipt });
  } catch (error) {
    console.error("Error transferring funds:", error);
    res.status(500).json({ error: "Failed to transfer funds" });
  }
});

app.post("/register-schema", async (req, res) => {
  const { schema, verifierDID } = req.body as {
    schema: TSchema;
    verifierDID: string;
  };
  try {
    const result = await registerSchemaOnSocket(schema, verifierDID);
    res.json({ message: "Schema registered successfully", result });
  } catch (error) {
    console.error("Error registering schema:", error);
    res.status(500).json({ error: "Failed to register schema" });
  }
});

app.post("/remove-schema", async (req, res) => {
  const { schemaName, verifierDID } = req.body;
  try {
    const result = await removeSchemaOnSocket(schemaName, verifierDID);
    res.json({ message: "Schema removed successfully", result });
  } catch (error) {
    console.error("Error removing schema:", error);
    res.status(500).json({ error: "Failed to remove schema" });
  }
});

app.get("/schemas", async (req, res) => {
  try {
    const schemas = await listSchemasOnSocket(verifierDIDs);
    res.json({ schemas });
  } catch (error) {
    console.error("Error retrieving schemas:", error);
    res.status(500).json({ error: "Failed to retrieve schemas" });
  }
});

app.post("/issue-credential", async (req, res) => {
  const { did, schemaName, data } = req.body;
  try {
    await issueCredentialBindingVC(did, data, schemaName);
    res.json({ message: `Credential issued to ${did}` });
  } catch (error) {
    console.error("Error issuing credential:", error);
    res.status(500).json({ error: "Failed to issue credential" });
  }
});

app.post("/verify-ownership", async (req, res) => {
  const { did, verifierDID } = req.body;
  try {
    await challengeOwnership(null, verifierDID, did, didToSocketMap);
    res.json({ message: "Ownership verification initiated" });
  } catch (error) {
    console.error("Error verifying ownership:", error);
    res.status(500).json({ error: "Failed to verify ownership" });
  }
});

app.post("/request-identity", async (req, res) => {
  const { bindingVCID } = req.body;
  try {
    await retrieveIdentityByVCID(null, bindingVCID);
    res.json({ message: "Identity request sent" });
  } catch (error) {
    console.error("Error requesting identity:", error);
    res.status(500).json({ error: "Failed to request identity" });
  }
});

app.post("/send-identity-to-issuer", async (req, res) => {
  const { issuerDID, identity, verifierDID } = req.body;
  try {
    await sendIdentityToIssuer(null, verifierDID, issuerDID, identity);
    res.json({ message: "Identity sent to issuer" });
  } catch (error) {
    console.error("Error sending identity:", error);
    res.status(500).json({ error: "Failed to send identity" });
  }
});

app.post("/ownership-verification", async (req, res) => {
  ownershipVerification(req, res, didToSocketMap);
});

app.post("/report-abuse", async (req, res) => {
  handleReport(io, req, res);
});

server.listen(port, "0.0.0.0", async () => {
  console.log(`Verifier REST API running on port ${port}`);
});
