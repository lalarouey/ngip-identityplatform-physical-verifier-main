import { Socket } from 'socket.io';
import { TSchema } from 'types.js';
import {
  getSchema,
  getSchemaNames,
  registerSchema,
  registerSchemaWithFlag,
  removeSchema,
} from '../schemaRegistry.js';

/**
 * This function listens for schema registration requests on a socket and registers the schema on the schema registry.
 *
 * socket listener: register-schema
 * socket emitter: schema-registration
 *
 * @param socket The socket to listen for schema registration requests
 *
 * @returns void
 *
 * @example
 * registerSchemaOnSocket(socket);
 */
export async function registerSchemaOnSocket(
  socket: Socket,
  schema: TSchema,
  issuerDID: string,
) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Received schema registration request...`);

  try {
    if (schema.requiresPhysicalVerification === undefined) {
      await registerSchema(issuerDID, schema);
    } else {
      await registerSchemaWithFlag(
        issuerDID,
        schema,
        schema.requiresPhysicalVerification,
      );
    }
    console.log(`[${timestamp}] Schema registered:`, schema);
    socket.emit('schema-registration', true);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to register schema';
    console.error(`[${timestamp}] Error while registering schema:`, error);
    socket.emit('custom-error', {
      title: 'Failed to register schema',
      errorMessage,
    });
  }
}

/**
 * This function listens for schema removal requests on a socket and removes the schema from the schema registry.
 *
 * socket listener: remove-schema
 * socket emitter: schema-removal
 *
 * @param socket The socket to listen for schema removal requests
 *
 * @returns void
 *
 * @example
 * removeSchemaOnSocket(socket);
 */
export async function removeSchemaOnSocket(
  socket: Socket,
  schemaName: string,
  issuerDID: string,
) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Received schema removal request...`);

  try {
    await removeSchema(issuerDID, schemaName);
    console.log(`[${timestamp}] Schema removed:`, schemaName);
    socket.emit('schema-removal', true);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to remove schema';
    console.error(`[${timestamp}] Error removing schema:`, error);
    socket.emit('custom-error', {
      title: 'Failed to remove Schema',
      errorMessage,
    });
  }
}

/**
 * This function listens for schema retrieval requests on a socket and retrieves the schemas from the schema registry.
 *
 * socket listener: retrieve-schemas
 * socket emitter: schema-retrieval
 *
 * @param socket The socket to listen for schema retrieval requests
 *
 * @returns void
 *
 * @example
 * listSchemasOnSocket(socket);
 */
export async function listSchemasOnSocket(socket: Socket, issuerDID: string) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Received schema retrieval request...`);

  try {
    const schemaNames = await getSchemaNames(issuerDID);

    const schemas = await Promise.all(
      schemaNames.map(async name => {
        const schema = (await getSchema(issuerDID, name)) as TSchema;
        return schema;
      }),
    );

    console.log(`[${timestamp}] Schemas retrieved:`, schemas);
    socket.emit('schema-retrieval', schemas);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to get schemas';
    console.error(`[${timestamp}] Error getting schemas:`, error);
    socket.emit('custom-error', {
      title: 'Failed to get schemas',
      errorMessage,
    });
  }
}
