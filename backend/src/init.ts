import { agent } from './server/server.js';
import { initializeDID } from './utils.js';

const defaultDID = await agent.didManagerGetByAlias({ alias: 'default' });
await initializeDID(defaultDID.did);
