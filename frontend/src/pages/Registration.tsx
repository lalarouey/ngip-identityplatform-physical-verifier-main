import { Button, Select, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import Topbar from 'components/Topbar';
import { useState } from 'react';
import { Socket } from 'socket.io-client';
import { TSchema } from 'types';

interface RegistrationProps {
  challengeResponse: boolean;
  setChallengeResponse: React.Dispatch<React.SetStateAction<boolean>>;
  schemas: TSchema[];
  socket: Socket;
  recipientDID: string;
  setRecipientDID: React.Dispatch<React.SetStateAction<string>>;
}

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

export default function Registration({
  schemas,
  socket,
  challengeResponse,
  setChallengeResponse,
  recipientDID,
  setRecipientDID,
}: RegistrationProps) {
  const [selectedSchema, setSelectedSchema] = useState<string | null>(null);

  const selectedSchemaObject = schemas.find(
    schema => schema.schemaName === selectedSchema,
  );

  const form = useForm({
    initialValues: selectedSchemaObject
      ? selectedSchemaObject.schemaFields.reduce((acc, field) => {
          acc[field.fieldName] = '';
          return acc;
        }, {} as { [key: string]: any })
      : {},
    validate: selectedSchemaObject
      ? selectedSchemaObject.schemaFields.reduce((acc, field) => {
          acc[field.fieldName] = value =>
            value ? null : `${capitalize(field.fieldName)} is required`;
          return acc;
        }, {} as { [key: string]: (value: any) => string | null })
      : {},
  });

  const handleSendChallenge = (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipientDID) {
      notifications.show({
        title: 'Validation Error',
        message: 'Recipient DID is required.',
        color: 'red',
      });
      return;
    }

    notifications.show({
      title: 'Challenge Sent',
      message: 'Waiting for response...',
      color: 'blue',
      loading: true,
    });

    socket.emit('verify-ownership', recipientDID);
  };

  const handleReset = () => {
    setRecipientDID('');
    setSelectedSchema(null);
    setChallengeResponse(false);
    form.reset();
  };

  const handleSubmit = (formValues: any) => {
    if (!recipientDID) {
      notifications.show({
        title: 'Validation Error',
        message: 'Recipient DID is required.',
        color: 'red',
      });
      return;
    }

    if (!selectedSchema) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please select a schema.',
        color: 'red',
      });
      return;
    }

    const processedValues = selectedSchemaObject?.schemaFields.reduce(
      (acc, field) => {
        acc[field.fieldName] =
          field.type === 'number'
            ? Number(formValues[field.fieldName])
            : formValues[field.fieldName];
        return acc;
      },
      {} as { [key: string]: any },
    );

    console.log('Verification Submitted:', {
      recipientDID,
      selectedSchema,
      processedValues,
    });

    socket.emit(
      'issue-credential',
      recipientDID,
      selectedSchema,
      processedValues,
    );

    notifications.show({
      title: 'Success',
      message: 'Verification submitted successfully!',
      color: 'green',
    });
  };

  return (
    <div>
      <Topbar subTabs={null} activeSubTab={null} setActiveSubTab={null} />
      <div
        style={{
          padding: '5vh',
          overflowY: 'auto',
          height: '92vh',
        }}
      >
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <Button
            color='red'
            variant='outline'
            onClick={handleReset}
            style={{ marginBottom: '20px' }}
          >
            Reset
          </Button>
          <form onSubmit={handleSendChallenge}>
            <TextInput
              label='Recipient DID'
              placeholder='Enter Recipient DID'
              value={recipientDID}
              onChange={e => setRecipientDID(e.target.value)}
              required
              style={{ marginBottom: '20px' }}
              disabled={challengeResponse}
            />
            <Button
              type='submit'
              color='blue'
              style={{ marginBottom: '20px' }}
              disabled={challengeResponse}
            >
              Send Challenge
            </Button>
          </form>

          {challengeResponse && (
            <>
              <Select
                label='Select Schema'
                placeholder='Choose a schema'
                data={schemas.map(schema => ({
                  value: schema.schemaName,
                  label: schema.schemaName,
                }))}
                value={selectedSchema}
                onChange={value => setSelectedSchema(value)}
                style={{ marginBottom: '20px' }}
              />
              {selectedSchema && (
                <form onSubmit={form.onSubmit(handleSubmit)}>
                  <Stack gap='md'>
                    {selectedSchemaObject?.schemaFields.map(field => (
                      <TextInput
                        key={field.fieldName}
                        label={capitalize(field.fieldName)}
                        placeholder={`Enter ${capitalize(field.fieldName)}`}
                        type={field.type === 'number' ? 'number' : 'text'}
                        {...form.getInputProps(field.fieldName)}
                      />
                    ))}
                    <Button type='submit' color='blue'>
                      Submit Verification
                    </Button>
                  </Stack>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
