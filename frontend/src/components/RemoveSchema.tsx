import { useState } from 'react';
import {
  Button,
  Card,
  Center,
  Flex,
  Loader,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { api } from '../api';

interface IRemoveSchemaProps {
  verifierDID: string | null;
  onSchemaRemoved?: () => void;
}

export default function RemoveSchema({ verifierDID, onSchemaRemoved }: IRemoveSchemaProps) {
  const [schemaName, setSchemaName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!verifierDID) {
      notifications.show({
        title: 'Validation Error',
        message: 'Verifier DID is not available.',
        color: 'red',
      });
      return;
    }

    if (
      window.confirm(
        `Are you sure you want to delete the schema "${schemaName}"?`,
      )
    ) {
      setIsLoading(true);
      try {
        await api.removeSchema(schemaName, verifierDID);
        notifications.show({
          title: 'Success',
          message: 'Schema removed successfully.',
          color: 'green',
        });
        setSchemaName('');
        if (onSchemaRemoved) {
          onSchemaRemoved();
        }
      } catch (error) {
        notifications.show({
          title: 'Error',
          message: error instanceof Error ? error.message : 'Failed to remove schema.',
          color: 'red',
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <Center style={{ height: '100vh' }}>
      <Card
        shadow='sm'
        padding='lg'
        radius='md'
        withBorder
        style={{ width: '400px' }}
      >
        <Title order={3} ta='center' style={{ marginBottom: '20px' }}>
          Remove Schema
        </Title>
        <form onSubmit={handleSubmit}>
          <Flex direction='column' gap='md'>
            <TextInput
              label='Schema Name'
              placeholder='Enter schema name'
              value={schemaName}
              onChange={e => setSchemaName(e.target.value)}
              required
              disabled={isLoading}
            />
            <Button type='submit' color='red' disabled={isLoading} fullWidth>
              {isLoading ? <Loader size='sm' color='white' /> : 'Delete'}
            </Button>
          </Flex>
        </form>
      </Card>
    </Center>
  );
}
