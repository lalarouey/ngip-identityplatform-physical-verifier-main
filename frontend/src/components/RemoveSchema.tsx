import { useState } from 'react';
import { Socket } from 'socket.io-client';
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

interface IRemoveSchemaProps {
  socket: Socket;
  success: boolean | null;
}

export default function RemoveSchema({ socket, success }: IRemoveSchemaProps) {
  const [schemaName, setSchemaName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (
      window.confirm(
        `Are you sure you want to delete the schema "${schemaName}"?`,
      )
    ) {
      if (!socket.connected) {
        setIsLoading(false);
        setStatus('Socket connection not established.');
        return;
      }
      socket.emit('remove-schema', schemaName);
      setIsLoading(true);
      setStatus('Removing schema...');
      if (success === false) {
        setIsLoading(false);
        setStatus('Failed to remove schema.');
      } else if (success) {
        setIsLoading(false);
        setStatus('Schema removed successfully.');
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
        {status && (
          <Text
            ta='center'
            c={status.includes('successfully') ? 'green' : 'red'}
            style={{ marginTop: '20px' }}
          >
            {status}
          </Text>
        )}
      </Card>
    </Center>
  );
}
