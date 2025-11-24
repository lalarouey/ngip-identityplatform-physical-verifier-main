import RegisterSchema from 'components/RegisterSchema';
import RemoveSchema from 'components/RemoveSchema';
import SchemaListView from 'components/SchemaView';
import { useState } from 'react';
import { TSchema, TField } from 'types';
import Topbar from '../components/Topbar';
import { api } from '../api';

interface ISchemaDashboardProps {
  schemas: TSchema[];
  setSchemas: (schemas: TSchema[]) => void;
  verifierDID: string | null;
}

export default function SchemaDashboard({
  schemas,
  setSchemas,
  verifierDID,
}: ISchemaDashboardProps) {
  const [activeSubTab, setSubActiveTab] = useState('schemas');

  const refreshSchemas = async () => {
    try {
      const result = await api.getSchemas();
      // Convert Schema[] to TSchema[] by ensuring schemaFields is a tuple
      const convertedSchemas: TSchema[] = result.schemas.map((schema) => ({
        ...schema,
        schemaFields: schema.schemaFields.length > 0 
          ? [schema.schemaFields[0], ...schema.schemaFields.slice(1)] as [TField, ...TField[]]
          : [{ fieldName: '', type: 'string' }] as [TField, ...TField[]]
      }));
      setSchemas(convertedSchemas);
    } catch (error) {
      console.error('Failed to refresh schemas:', error);
    }
  };

  const renderComponent = () => {
    switch (activeSubTab) {
      case 'registerSchema':
        return (
          <RegisterSchema 
            verifierDID={verifierDID} 
            onSchemaRegistered={refreshSchemas}
          />
        );
      case 'deleteSchema':
        return (
          <RemoveSchema 
            verifierDID={verifierDID} 
            onSchemaRemoved={refreshSchemas}
          />
        );
      case 'schemas':
        return (
          <SchemaListView
            schemas={schemas}
            setSchemas={setSchemas}
          />
        );
      default:
        return null;
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
