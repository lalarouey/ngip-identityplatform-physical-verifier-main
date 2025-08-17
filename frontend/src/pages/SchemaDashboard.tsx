import RegisterSchema from 'components/RegisterSchema';
import RemoveSchema from 'components/RemoveSchema';
import SchemaListView from 'components/SchemaView';
import { useState } from 'react';
import { Socket } from 'socket.io-client';
import { TSchema } from 'types';
import Topbar from '../components/Topbar';

interface ISchemaDashboardProps {
  schemaRegSuccess: boolean | null;
  schemaRemoveSuccess: boolean | null;
  schemas: TSchema[];
  setSchemas: (schemas: TSchema[]) => void;
  socket: Socket;
}

export default function SchemaDashboard({
  schemaRegSuccess,
  schemaRemoveSuccess,
  schemas,
  setSchemas,
  socket,
}: ISchemaDashboardProps) {
  const [activeSubTab, setSubActiveTab] = useState('schemas');

  if (socket.id === undefined) {
    return <div>Socket connection not established.</div>;
  }

  const renderComponent = () => {
    if (!socket.connected) {
      return;
    }
    switch (activeSubTab) {
      case 'registerSchema':
        return (
          <RegisterSchema schemaRegSuccess={schemaRegSuccess} socket={socket} />
        );
      case 'deleteSchema':
        return <RemoveSchema socket={socket} success={schemaRemoveSuccess} />;
      case 'schemas':
        return (
          <SchemaListView
            socket={socket}
            schemas={schemas}
            setSchemas={setSchemas}
          />
        );
      default:
        'schemas';
    }
  };

  return (
    <div>
      <Topbar
        subTabs={['schemas', 'registerSchema', 'deleteSchema']}
        activeSubTab={activeSubTab}
        setActiveSubTab={setSubActiveTab}
      />
      {renderComponent()}
    </div>
  );
}
