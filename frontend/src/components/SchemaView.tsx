import { Button, Card, Divider, Flex, Text, Title } from '@mantine/core';
import { useCallback, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { TField, TSchema } from 'types';

interface schemaViewProps {
  schema: TSchema;
}

export function SchemaView({ schema }: schemaViewProps) {
  return (
    <Card shadow='sm' padding='lg' radius='md' withBorder w='400px'>
      <Title order={4} style={{ textTransform: 'capitalize' }}>
        {schema.schemaName}
      </Title>
      <Divider my='sm' />
      <Title order={5} style={{ textTransform: 'capitalize' }}>
        Fields
      </Title>
      <div style={{ marginBottom: '10px' }}></div>
      {schema.schemaFields.map((field, index) => (
        <div key={index} style={{ display: 'flex', gap: '50px' }}>
          <Text w={200} style={{ textTransform: 'capitalize' }}>
            {field.fieldName}
          </Text>
          <Text style={{ textTransform: 'capitalize' }}>{field.type}</Text>
        </div>
      ))}
    </Card>
  );
}

interface schemaListView {
  socket: Socket;
  schemas: TSchema[];
  setSchemas: (schemas: TSchema[]) => void;
}

export default function SchemaListView({
  socket,
  schemas,
  setSchemas,
}: schemaListView) {
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    handleSchemasRetrieved(schemas);
  }, [schemas]);

  const handleSchemasRetrieved = useCallback((schemas: TSchema[] | boolean) => {
    if (Array.isArray(schemas) && schemas.every(isTSchema)) {
      setSchemas(schemas);
    } else {
      setStatus('Error listing schemas.');
    }
  }, []);

  function isTSchema(schema: any): schema is TSchema {
    return (
      typeof schema === 'object' &&
      typeof schema.schemaName === 'string' &&
      Array.isArray(schema.schemaFields) &&
      schema.schemaFields.every(
        (field: TField) =>
          typeof field.fieldName === 'string' && typeof field.type === 'string',
      )
    );
  }

  function handleRefresh() {
    if (!socket.connected) {
      setStatus('Socket connection not established.');
      return;
    }
    socket.emit('retrieve-schemas');
  }

  return (
    <div
      style={{
        padding: '5vh',
        overflowY: 'auto',
        flexGrow: 1,
        height: '92vh',
      }}
    >
      <Flex justify='center' align='center' direction='column' gap='md'>
        <Button color='gray' onClick={handleRefresh}>
          Refresh List
        </Button>
        {schemas.length > 0 ? (
          schemas.map((schema, index) => (
            <SchemaView key={index} schema={schema} />
          ))
        ) : (
          <Text style={{ textTransform: 'capitalize' }}>No Schemas found.</Text>
        )}
        <Text style={{ textTransform: 'capitalize' }}>{status}</Text>
      </Flex>
    </div>
  );
}
