import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { TField, TSchema } from 'types';
import { Button, Flex, Loader, Select, TextInput, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';

interface RegisterSchemaProps {
  socket: Socket;
  schemaRegSuccess: boolean | null;
}

export default function RegisterSchema({
  socket,
  schemaRegSuccess,
}: RegisterSchemaProps) {
  const [schemaName, setSchemaName] = useState<string>('');
  const [schemaFields, setSchemaFields] = useState<TField[]>([
    { fieldName: '', type: 'string' },
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    setIsLoading(false);
    if (schemaRegSuccess) {
      notifications.show({
        title: 'Success',
        message: 'Schema registered successfully.',
        color: 'green',
      });
      setSchemaName('');
      setSchemaFields([{ fieldName: '', type: 'string' }]);
    } else if (schemaRegSuccess === false) {
      notifications.show({
        title: 'Error',
        message: 'Failed to register schema.',
        color: 'red',
      });
    }
  }, [schemaRegSuccess]);

  const handleAddField = () => {
    setSchemaFields([...schemaFields, { fieldName: '', type: 'string' }]);
  };

  const handleRemoveField = (index: number) => {
    const newFields = schemaFields.filter((_, i) => i !== index);
    setSchemaFields(newFields);
  };

  const handleFieldChange = (index: number, field: Partial<TField>) => {
    const newFields = schemaFields.map((f, i) =>
      i === index ? { ...f, ...field } : f,
    );
    setSchemaFields(newFields);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const schema: TSchema = {
      schemaName: schemaName,
      schemaFields: [schemaFields[0], ...schemaFields.slice(1)],
    };
    if (!socket.connected) {
      notifications.show({
        title: 'Connection Error',
        message: 'Socket connection not established.',
        color: 'red',
      });
    } else {
      setIsLoading(true);
      socket.emit('register-schema', schema);
    }
  };

  return (
    <div style={{ padding: '5vh', maxWidth: '600px', margin: '0 auto' }}>
      <Title order={2} ta='center' style={{ marginBottom: '20px' }}>
        Register Schema
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
          {schemaFields.map((field, index) => (
            <Flex key={index} gap='md' align='center'>
              <TextInput
                placeholder='Field Name'
                value={field.fieldName}
                onChange={e =>
                  handleFieldChange(index, { fieldName: e.target.value })
                }
                disabled={isLoading}
                style={{ flex: 1 }}
              />
              <Select
                data={[
                  { value: 'string', label: 'String' },
                  { value: 'number', label: 'Number' },
                ]}
                value={field.type}
                onChange={value =>
                  handleFieldChange(index, { type: value as TField['type'] })
                }
                disabled={isLoading}
                style={{ flex: 1 }}
              />
              <Button
                color='red'
                variant='outline'
                onClick={() => handleRemoveField(index)}
                disabled={isLoading}
              >
                Remove
              </Button>
            </Flex>
          ))}
          <Button
            variant='outline'
            onClick={handleAddField}
            disabled={isLoading}
          >
            Add Field
          </Button>
          <Button type='submit' color='blue' disabled={isLoading}>
            {isLoading ? <Loader size='sm' color='white' /> : 'Submit'}
          </Button>
        </Flex>
      </form>
    </div>
  );
}
