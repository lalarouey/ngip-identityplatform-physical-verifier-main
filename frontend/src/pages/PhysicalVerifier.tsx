import { notifications } from '@mantine/notifications';
import MyPage from 'components/MyPage';
import Sidebar from 'components/Sidebar';
import Registration from 'pages/Registration';
import Reports from 'pages/Reports';
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { TReport, TSchema } from 'types';
import SchemaDashboard from './SchemaDashboard';

export default function PhysicalVerifier() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<
    'registration' | 'reports' | 'schemaDashboard' | 'myPage' | null
  >(null);
  const [schemaRemoveSuccess, setSchemaRemoveSuccess] = useState<
    boolean | null
  >(null);
  const [schemaRegSuccess, setSchemaRegSuccess] = useState<boolean | null>(
    null,
  );
  const [schemas, setSchemas] = useState<TSchema[]>([]);
  const [did, setDid] = useState<string | null>(null);
  const [ethAddress, setEthAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [challengeResponse, setChallengeResponse] = useState(false);
  const [recipientDID, setRecipientDID] = useState('');
  const [abuseReports, setAbuseReports] = useState<TReport[]>([]);
  const [revealedIdentities, setRevealedIdentities] = useState<
    Record<string, any>
  >({});

  const connectSocket = () => {
    if (!socket) {
      const newSocket = io('http://localhost:3008');

      newSocket.on('connect', () => {
        setConnected(true);
      });

      newSocket.on(
        'challenge-response',
        (holderDID: string, response: boolean) => {
          notifications.show({
            title: 'Challenge Response',
            message: `Challenge response for ${holderDID}: ${response}`,
            color: response ? 'green' : 'red',
          });
          setChallengeResponse(response);
        },
      );

      newSocket.on('identity-retrieved', (identityData: any) => {
        if (identityData && identityData.id) {
          setRevealedIdentities(prev => ({
            ...prev,
            [identityData.id]: identityData,
          }));
        }
      });

      newSocket.on('schema-registration', (success: boolean) => {
        setSchemaRegSuccess(success);
      });

      newSocket.on('schema-retrieval', (schemas: TSchema[]) => {
        setSchemas(schemas);
      });

      newSocket.on('schema-removal', (success: boolean) => {
        setSchemaRemoveSuccess(success);
      });

      newSocket.on(
        'identifier-info',
        (verifierDID: string, ethAddress: string, balance: number) => {
          setDid(verifierDID);
          setEthAddress(ethAddress);
          setBalance(balance);
        },
      );

      newSocket.on('did-initialized', () => {
        notifications.show({
          message: 'DID has been initialized',
          color: 'green',
        });
      });

      newSocket.on('did-cleared', () => {
        notifications.show({
          message: 'DID has been cleared',
          color: 'red',
        });
      });

      newSocket.on('funds-transferred', (recipient: string) => {
        notifications.show({
          message: `Funds have been transferred to ${recipient}`,
          color: 'green',
        });
      });

      newSocket.on('physical-verifier-report', (report: TReport) => {
        setAbuseReports(prev => [...prev, report]);
        notifications.show({
          title: 'New Escalated Abuse Report',
          message: `Abuser: ${report.holderDID}`,
          color: 'blue',
        });
      });

      newSocket.on(
        'custom-error',
        (error: { title: string; errorMessage: string }) => {
          notifications.show({
            title: error.title,
            message: error.errorMessage,
            color: 'red',
          });
        },
      );

      setSocket(newSocket);
      setActiveTab('myPage');
    }
  };

  const disconnectSocket = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setConnected(false);
    }
  };

  useEffect(() => {
    if (socket && socket.connected) {
      socket.emit('retrieve-schemas');
    }
  }, [socket?.connected]);

  function renderComponent() {
    if (!socket || !socket.connected) {
      return null;
    }
    switch (activeTab) {
      case 'registration':
        return (
          <Registration
            socket={socket}
            schemas={schemas}
            challengeResponse={challengeResponse}
            setChallengeResponse={setChallengeResponse}
            recipientDID={recipientDID}
            setRecipientDID={setRecipientDID}
          />
        );
      case 'reports':
        return (
          <Reports
            socket={socket}
            reports={abuseReports}
            setReports={setAbuseReports}
            revealedIdentities={revealedIdentities}
            setRevealedIdentities={setRevealedIdentities}
          />
        );
      case 'schemaDashboard':
        return (
          <SchemaDashboard
            schemaRegSuccess={schemaRegSuccess}
            schemaRemoveSuccess={schemaRemoveSuccess}
            schemas={schemas}
            setSchemas={setSchemas}
            socket={socket}
          />
        );
      case 'myPage':
        return (
          <MyPage
            socket={socket}
            ethAddress={ethAddress}
            did={did}
            balance={balance}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        padding: 0,
        margin: 0,
        display: 'flex',
        flexDirection: 'row',
      }}
    >
      <Sidebar
        activeTab={activeTab}
        connected={connected}
        setActiveTab={setActiveTab}
        connectSocket={connectSocket}
        disconnectSocket={disconnectSocket}
      />
      <div
        style={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '0px',
          margin: 0,
          overflowY: 'auto', // Allow scrolling for large content
        }}
      >
        {socket && socket.connected && renderComponent()}
      </div>
    </div>
  );
}
