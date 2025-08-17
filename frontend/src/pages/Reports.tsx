import { Button, Card, Divider, Flex, Group, Stack, Text } from '@mantine/core';
import Topbar from 'components/Topbar';
import { Socket } from 'socket.io-client';
import { TReport } from 'types';

interface IdentityCardProps {
  identity: Record<string, any>;
}

function IdentityCard({ identity }: IdentityCardProps) {
  return (
    <Card mt='md' padding='md' shadow='xs' withBorder>
      <Text fw={700} mb='sm'>
        Revealed Identity
      </Text>
      <Divider mb='sm' />
      <Stack p='xs'>
        {Object.entries(identity).map(([key, value], index) => (
          <Flex key={index} justify='space-between'>
            <Text fw={600} w={120}>
              {key}
            </Text>
            <Text>{String(value)}</Text>
          </Flex>
        ))}
      </Stack>
    </Card>
  );
}

export default function Reports({
  socket,
  reports,
  setReports,
  revealedIdentities,
  setRevealedIdentities,
}: {
  socket: Socket;
  reports: TReport[];
  setReports: (r: TReport[]) => void;
  revealedIdentities: Record<string, any>;
  setRevealedIdentities: (r: Record<string, any>) => void;
}) {
  const markAsResolved = (vcID: string, holderDID: string) => {
    setReports(reports.filter(r => r.vcID !== vcID));
    setReports(reports.filter(r => r.vcID !== vcID));

    const updatedIdentities = { ...revealedIdentities };
    delete updatedIdentities[holderDID];

    setRevealedIdentities(updatedIdentities);
  };

  const requestIdentity = (vcID: string) => {
    socket.emit('request-identity', vcID);
  };

  const sendIdentityToIssuer = (
    issuerDID: string,
    identity: Record<string, any>,
  ) => {
    socket.emit('send-identity-to-issuer', issuerDID, identity);
  };

  return (
    <div>
      <Topbar subTabs={null} activeSubTab={null} setActiveSubTab={null} />
      <Stack p='xl'>
        {reports.map((report, index) => (
          <Card key={index} shadow='sm' padding='lg' withBorder>
            <Flex direction='column' gap='sm'>
              <Text>
                <b>Issuer:</b> {report.senderDID}
              </Text>
              <Text>
                <b>Abuser:</b> {report.holderDID}
              </Text>
              <Text>
                <b>VC ID:</b> {report.vcID}
              </Text>
              <Text>
                <b>Description:</b> {report.description}
              </Text>
            </Flex>
            <Divider my='md' />
            {revealedIdentities[report.holderDID] && (
              <IdentityCard identity={revealedIdentities[report.holderDID]} />
            )}
            <Divider my='md' />
            <Group justify='flex-end'>
              <Button
                variant='outline'
                onClick={() => requestIdentity(report.vcID)}
              >
                Request Identity
              </Button>
              {revealedIdentities[report.holderDID] && (
                <Button
                  variant='outline'
                  color='blue'
                  onClick={() =>
                    sendIdentityToIssuer(
                      report.senderDID,
                      revealedIdentities[report.holderDID],
                    )
                  }
                >
                  Send to Issuer
                </Button>
              )}
              <Button
                color='green'
                onClick={() => markAsResolved(report.vcID, report.holderDID)}
              >
                Mark as Resolved
              </Button>
            </Group>
          </Card>
        ))}
        {reports.length === 0 && (
          <Text ta='center' c='dimmed'>
            No abuse reports received yet.
          </Text>
        )}
      </Stack>
    </div>
  );
}
