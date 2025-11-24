import {
  Button,
  Card,
  Divider,
  Flex,
  Group,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { api } from "../api";

interface IMyPageProps {
  verifierDID: string | null;
  ethAddress: string | null;
  dids: string[];
  balance: number | null;
  onRefresh: () => void;
}

export default function MyPage({
  verifierDID,
  ethAddress,
  dids,
  balance,
  onRefresh,
}: IMyPageProps) {
  const [transferAddress, setTransferAddress] = useState<string>(""); // State for the input field
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});

  async function initializeDID(did: string) {
    setLoading((prev) => ({ ...prev, [`init-${did}`]: true }));
    try {
      notifications.show({
        title: "Initializing DID",
        message: `Initializing DID: ${did}`,
        color: "blue",
        loading: true,
      });
      await api.initializeDID(did);
      notifications.show({
        title: "Success",
        message: `DID ${did} initialized successfully`,
        color: "green",
      });
      onRefresh();
    } catch (error) {
      notifications.show({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to initialize DID",
        color: "red",
      });
    } finally {
      setLoading((prev) => ({ ...prev, [`init-${did}`]: false }));
    }
  }

  async function clearDID(did: string) {
    setLoading((prev) => ({ ...prev, [`clear-${did}`]: true }));
    try {
      notifications.show({
        title: "Clearing DID",
        message: `Clearing DID: ${did}`,
        color: "orange",
        loading: true,
      });
      await api.clearDID(did);
      notifications.show({
        title: "Success",
        message: `DID ${did} cleared successfully`,
        color: "green",
      });
      onRefresh();
    } catch (error) {
      notifications.show({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to clear DID",
        color: "red",
      });
    } finally {
      setLoading((prev) => ({ ...prev, [`clear-${did}`]: false }));
    }
  }

  async function transferFunds() {
    if (!transferAddress) {
      notifications.show({
        title: "Validation Error",
        message: "Please enter a valid address.",
        color: "red",
      });
      return;
    }

    if (!verifierDID) {
      notifications.show({
        title: "Validation Error",
        message: "Verifier DID is not available.",
        color: "red",
      });
      return;
    }

    setLoading((prev) => ({ ...prev, transfer: true }));
    try {
      notifications.show({
        title: "Transferring Funds",
        message: `Transferring funds to: ${transferAddress}`,
        color: "blue",
        loading: true,
      });
      const result = await api.transferFunds(transferAddress, verifierDID);
      notifications.show({
        title: "Success",
        message: result.message || `Funds transferred to ${transferAddress}`,
        color: "green",
      });
      setTransferAddress("");
      onRefresh();
    } catch (error) {
      notifications.show({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to transfer funds",
        color: "red",
      });
    } finally {
      setLoading((prev) => ({ ...prev, transfer: false }));
    }
  }

  return (
    <Flex
      justify="center"
      align="center"
      style={{ height: "90%", width: "100%" }} // Take up available space
    >
      <Card
        shadow="lg" // Increased shadow for better depth
        padding="xl"
        radius="lg" // More rounded corners
        withBorder
        style={{ width: "800px", height: "500px", overflowY: "auto" }} // Fixed width for the card
      >
        <Title order={3} mb="m">
          My Digital Identity
        </Title>
        <Divider mb="lg" /> {/* Increased space below the divider */}
        {/* <Text size='m' c='dimmed' mb='xs'>
          DID:
        </Text>
        <Text w={500} mb='md'>
          {did !== null ? did : 'Could not load DID'}
        </Text> */}
        <Text size="m" c="dimmed" mb="xs">
          All DIDs:
        </Text>
        {dids.length === 0 ? (
          <Text w={500} mb="md">
            No DIDs found
          </Text>
        ) : (
          dids.map((did, index) => (
            <Flex
              key={index}
              justify="space-between"
              align="center"
              style={{
                marginBottom: "12px",
                flexWrap: "wrap", // allow long DIDs to wrap to next line
              }}
            >
              <Text
                style={{
                  wordBreak: "break-all", // ensures long DIDs don't overflow
                  flex: 1,
                  marginRight: "10px",
                }}
              >
                {did}
              </Text>

              <Group gap="xs">
                <Button
                  size="xs"
                  variant="outline"
                  color="blue"
                  onClick={() => initializeDID(did)}
                  loading={loading[`init-${did}`]}
                  disabled={loading[`init-${did}`] || loading[`clear-${did}`]}
                >
                  Initialize
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  color="red"
                  onClick={() => clearDID(did)}
                  loading={loading[`clear-${did}`]}
                  disabled={loading[`init-${did}`] || loading[`clear-${did}`]}
                >
                  Clear
                </Button>
              </Group>
            </Flex>
          ))
        )}
        <Divider my="lg" />
        <Text size="m" c="dimmed" mb="xs">
          Ethereum Address:
        </Text>
        <Text w={500} mb="md">
          {ethAddress !== null ? ethAddress : "Could not load Ethereum Address"}
        </Text>
        <Text size="m" c="dimmed" mb="xs">
          Balance:
        </Text>
        <Text w={500}>
          {balance !== null ? `${balance} Eth` : "Could not load balance"}
        </Text>
        <Flex
          justify="space-between"
          align="center"
          style={{ marginTop: "20px" }}
        >
          <TextInput
            placeholder="Enter recipient address"
            value={transferAddress}
            onChange={(e) => setTransferAddress(e.target.value)}
            style={{ flex: 1, marginRight: "10px" }}
          />
          <Button
            variant="outline"
            color="green"
            onClick={transferFunds}
            loading={loading.transfer}
            disabled={loading.transfer || !verifierDID}
            style={{
              width: "150px",
              height: "40px",
            }}
          >
            Transfer Funds
          </Button>
        </Flex>
        {/* <Divider my="lg" />
        <Flex
          justify="space-between"
          align="flex-end"
          style={{ height: "100%" }}
        >
          <Button
            variant="outline"
            color="blue"
            onClick={() => initializeDID(did)}
            style={{
              width: "150px",
              height: "40px",
            }}
          >
            Initialize DID
          </Button>
          <Button
            variant="outline"
            color="red"
            onClick={() => clearDID(did)}
            style={{
              width: "150px",
              height: "40px",
            }}
          >
            Clear DID
          </Button>
        </Flex> */}
      </Card>
    </Flex>
  );
}
