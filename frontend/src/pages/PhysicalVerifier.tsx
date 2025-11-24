import { notifications } from "@mantine/notifications";
import MyPage from "components/MyPage";
import Sidebar from "components/Sidebar";
import Registration from "pages/Registration";
import Reports from "pages/Reports";
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { TReport, TSchema, TField } from "types";
import SchemaDashboard from "./SchemaDashboard";
import { api } from "../api";

export default function PhysicalVerifier() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<
    "registration" | "reports" | "schemaDashboard" | "myPage" | null
  >(null);
  const [schemas, setSchemas] = useState<TSchema[]>([]);
  const [dids, setDids] = useState<string[]>([]);
  const [verifierDID, setVerifierDID] = useState<string | null>(null);
  const [ethAddress, setEthAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [challengeResponse, setChallengeResponse] = useState(false);
  const [recipientDID, setRecipientDID] = useState("");
  const [abuseReports, setAbuseReports] = useState<TReport[]>([]);
  const [revealedIdentities, setRevealedIdentities] = useState<
    Record<string, any>
  >({});

  const connectSocket = () => {
    if (!socket) {
      const newSocket = io("http://localhost:3008");

      newSocket.on("connect", () => {
        setConnected(true);
      });

      newSocket.on(
        "challenge-response",
        (holderDID: string, response: boolean) => {
          notifications.show({
            title: "Challenge Response",
            message: `Challenge response for ${holderDID}: ${response}`,
            color: response ? "green" : "red",
          });
          setChallengeResponse(response);
        }
      );

      newSocket.on("identity-retrieved", (identityData: any) => {
        if (identityData && identityData.id) {
          setRevealedIdentities((prev) => ({
            ...prev,
            [identityData.id]: identityData,
          }));
        }
      });

      // Schema updates are now handled via REST API
      // Socket events can still be used for real-time notifications if needed

      // Note: identifier-info is now fetched via REST API
      // Socket events for real-time updates can still be used if needed

      newSocket.on("did-initialized", () => {
        notifications.show({
          message: "DID has been initialized",
          color: "green",
        });
      });

      newSocket.on("did-cleared", () => {
        notifications.show({
          message: "DID has been cleared",
          color: "red",
        });
      });

      newSocket.on("funds-transferred", (recipient: string) => {
        notifications.show({
          message: `Funds have been transferred to ${recipient}`,
          color: "green",
        });
      });

      newSocket.on("physical-verifier-report", (report: TReport) => {
        setAbuseReports((prev) => [...prev, report]);
        notifications.show({
          title: "New Escalated Abuse Report",
          message: `Abuser: ${report.holderDID}`,
          color: "blue",
        });
      });

      newSocket.on(
        "custom-error",
        (error: { title: string; errorMessage: string }) => {
          notifications.show({
            title: error.title,
            message: error.errorMessage,
            color: "red",
          });
        }
      );

      setSocket(newSocket);
      setActiveTab("myPage");
    }
  };

  const disconnectSocket = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setConnected(false);
    }
  };

  // Fetch identifier info and schemas on mount and when socket connects
  const fetchIdentifierInfo = async () => {
    try {
      const info = await api.getIdentifierInfo();
      setDids(info.verifierDIDs);
      setVerifierDID(info.verifierDIDs[0] || null); // Use first DID as default
      setEthAddress(info.ethAddress);
      setBalance(parseFloat(info.balance));
    } catch (error) {
      notifications.show({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to fetch identifier info",
        color: "red",
      });
    }
  };

  const fetchSchemas = async () => {
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
      notifications.show({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to fetch schemas",
        color: "red",
      });
    }
  };

  useEffect(() => {
    fetchIdentifierInfo();
    fetchSchemas();
  }, []);

  useEffect(() => {
    if (socket && socket.connected) {
      // Still listen for real-time schema updates via socket if needed
      // But primary source is REST API
      fetchSchemas();
    }
  }, [socket?.connected]);

  function renderComponent() {
    if (!socket || !socket.connected) {
      return null;
    }
    switch (activeTab) {
      case "registration":
        return (
          <Registration
            verifierDID={verifierDID}
            schemas={schemas}
            challengeResponse={challengeResponse}
            setChallengeResponse={setChallengeResponse}
            recipientDID={recipientDID}
            setRecipientDID={setRecipientDID}
          />
        );
      case "reports":
        return (
          <Reports
            socket={socket}
            reports={abuseReports}
            setReports={setAbuseReports}
            revealedIdentities={revealedIdentities}
            setRevealedIdentities={setRevealedIdentities}
          />
        );
      case "schemaDashboard":
        return (
          <SchemaDashboard
            schemas={schemas}
            setSchemas={setSchemas}
            verifierDID={verifierDID}
          />
        );
      case "myPage":
        return (
          <MyPage
            verifierDID={verifierDID}
            ethAddress={ethAddress}
            dids={dids}
            balance={balance}
            onRefresh={fetchIdentifierInfo}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        padding: 0,
        margin: 0,
        display: "flex",
        flexDirection: "row",
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
          display: "flex",
          flexDirection: "column",
          padding: "0px",
          margin: 0,
          overflowY: "auto", // Allow scrolling for large content
        }}
      >
        {socket && socket.connected && renderComponent()}
      </div>
    </div>
  );
}
