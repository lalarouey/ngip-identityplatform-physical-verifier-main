import { Button, Card, Divider, Flex, Text, Title } from '@mantine/core';
import { useEffect, useState } from 'react';
import { TField, TSchema } from 'types';
import { api } from '../api';

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
  schemas: TSchema[];
  setSchemas: (schemas: TSchema[]) => void;
}

export default function SchemaListView({
  schemas,
  setSchemas,
}: schemaListView) {
  const [loading, setLoading] = useState(false);

  async function handleRefresh() {
    setLoading(true);
    try {
      const result = await api.getSchemas();
      setSchemas(result.schemas);
    } catch (error) {
      console.error('Failed to refresh schemas:', error);
    } finally {
      setLoading(false);
    }
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
        <Button color='gray' onClick={handleRefresh} loading={loading}>
          Refresh List
        </Button>
        {schemas.length > 0 ? (
          schemas.map((schema, index) => (
            <SchemaView key={index} schema={schema} />
          ))
        ) : (
          <Text style={{ textTransform: 'capitalize' }}>No Schemas found.</Text>
        )}
      </Flex>
    </div>
  );
}
