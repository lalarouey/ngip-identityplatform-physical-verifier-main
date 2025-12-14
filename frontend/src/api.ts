const API_BASE_URL = "http://localhost:3008";

export interface IdentifierInfo {
  verifierDIDs: string[];
  ethAddress: string;
  balance: string;
}

export interface Schema {
  schemaName: string;
  schemaFields: Array<{
    fieldName: string;
    type: string;
  }>;
  requiresPhysicalVerification?: boolean;
}

export interface VerifyOwnershipRequest {
  did: string;
  verifierDID: string;
}

export interface IssueCredentialRequest {
  did: string;
  schemaName: string;
  data: Record<string, any>;
}

export interface TransferFundsRequest {
  recipient: string;
  verifierDID: string;
}

export interface RegisterSchemaRequest {
  schema: Schema;
  verifierDID: string;
}

export interface RemoveSchemaRequest {
  schemaName: string;
  verifierDID: string;
}

export interface RequestIdentityRequest {
  bindingVCID: string;
}

export interface SendIdentityToIssuerRequest {
  issuerDID: string;
  identity: any;
  verifierDID: string;
}

// API Functions
export const api = {
  // Get identifier info (DIDs, address, balance)
  async getIdentifierInfo(): Promise<IdentifierInfo> {
    const response = await fetch(`${API_BASE_URL}/identifier-info`);
    if (!response.ok) {
      throw new Error("Failed to fetch identifier info");
    }
    return response.json();
  },

  // Initialize a DID
  async initializeDID(did: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/initialize-did`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ did }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to initialize DID");
    }
    return response.json();
  },

  // Clear a DID
  async clearDID(did: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/clear-did`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ did }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to clear DID");
    }
    return response.json();
  },

  // Transfer funds
  async transferFunds(
    recipient: string,
    verifierDID: string
  ): Promise<{ message: string; receipt?: any }> {
    const response = await fetch(`${API_BASE_URL}/transfer-funds`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient, verifierDID }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to transfer funds");
    }
    return response.json();
  },

  // Get all schemas
  async getSchemas(): Promise<{ schemas: Schema[] }> {
    const response = await fetch(`${API_BASE_URL}/schemas`);
    if (!response.ok) {
      throw new Error("Failed to fetch schemas");
    }
    return response.json();
  },

  // Register a schema
  async registerSchema(
    schema: Schema,
    verifierDID: string
  ): Promise<{ message: string; result?: any }> {
    const response = await fetch(`${API_BASE_URL}/register-schema`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schema, verifierDID }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to register schema");
    }
    return response.json();
  },

  // Remove a schema
  async removeSchema(
    schemaName: string,
    verifierDID: string
  ): Promise<{ message: string; result?: any }> {
    const response = await fetch(`${API_BASE_URL}/remove-schema`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schemaName, verifierDID }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to remove schema");
    }
    return response.json();
  },

  // Issue credential
  async issueCredential(
    did: string,
    schemaName: string,
    data: Record<string, any>
  ): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/issue-credential`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ did, schemaName, data }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to issue credential");
    }
    return response.json();
  },

  // Verify ownership
  async verifyOwnership(
    did: string,
    verifierDID: string
  ): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/verify-ownership`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ did, verifierDID }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to verify ownership");
    }
    return response.json();
  },

  // Request identity
  async requestIdentity(
    bindingVCID: string
  ): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/request-identity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bindingVCID }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to request identity");
    }
    return response.json();
  },

  // Send identity to issuer
  async sendIdentityToIssuer(
    issuerDID: string,
    identity: any,
    verifierDID: string
  ): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/send-identity-to-issuer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issuerDID, identity, verifierDID }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to send identity to issuer");
    }
    return response.json();
  },


  // Request Delegation
  async requestDelegation(
    recipientDID: string,
    scope: string,
    purpose: string,
    audience: string[],
    expiry?: string
  ): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/request-delegation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientDID, scope, purpose, audience, expiry }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to request delegation");
    }
    return response.json();
  },

  // Get Held Credentials
  async getHeldCredentials(): Promise<{ credentials: any[] }> {
    const response = await fetch(`${API_BASE_URL}/held-credentials`);
    if (!response.ok) {
      throw new Error("Failed to fetch held credentials");
    }
    return response.json();
  },

  // Request Data Access
  async requestDataAccess(
    delegationVcId: string,
    targetDID: string
  ): Promise<{ message: string; data?: any }> {
    const response = await fetch(`${API_BASE_URL}/request-data-access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delegationVcId, targetDID }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to request data access");
    }
    return response.json();
  },
};
