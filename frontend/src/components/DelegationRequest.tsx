import {
    Button,
    Card,
    Flex,
    Stack,
    Text,
    TextInput,
    Title,
    Badge,
    Group,
    TagsInput,
    Modal,
    Code,
    ScrollArea,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";
import { api } from "../api";

export default function DelegationRequest() {
    const [activeTab, setActiveTab] = useState<"request" | "credentials">("request");
    const [recipientDID, setRecipientDID] = useState("");
    const [scope, setScope] = useState("medicalHistory");
    const [purpose, setPurpose] = useState("continuityOfCare");
    const [audience, setAudience] = useState<string[]>([]);
    const [expiry, setExpiry] = useState("");
    const [loading, setLoading] = useState(false);
    const [credentials, setCredentials] = useState<any[]>([]);
    const [selectedCredential, setSelectedCredential] = useState<any>(null);
    const [opened, { open, close }] = useDisclosure(false);

    const fetchCredentials = async () => {
        try {
            const result = await api.getHeldCredentials();
            setCredentials(result.credentials || []);
        } catch (error) {
            console.error("Error fetching credentials:", error);
        }
    };

    useEffect(() => {
        if (activeTab === "credentials") {
            fetchCredentials();
        }
    }, [activeTab]);

    const handleRequest = async () => {
        if (!recipientDID || !scope || !purpose || audience.length === 0) {
            notifications.show({ message: "Missing required fields", color: "red" });
            return;
        }
        setLoading(true);
        try {
            await api.requestDelegation(recipientDID, scope, purpose, audience, expiry);
            notifications.show({ message: "Delegation request sent successfully", color: "green" });
            setRecipientDID("");
            setAudience([]);
        } catch (error) {
            console.error(error);
            notifications.show({ message: "Error sending delegation request", color: "red" });
        } finally {
            setLoading(false);
        }
    };

    const openDetails = (cred: any) => {
        const credentialData = JSON.parse(cred.credential || "{}");
        setSelectedCredential({ ...cred, credentialData });
        open();
    };

    const handleDataAccess = async (vcID: string) => {
        setLoading(true);
        try {
            // Assuming target is SHP (Issuer) for now. In reality, we'd pick from audience or input.
            // We'll use a hardcoded DID or assume the backend handles it via the route.
            // The backend route assumes we hit localhost:3004.
            const targetDID = "did:web:localhost%3A3004";

            const result = await (api as any).requestDataAccess(vcID, targetDID);

            if (result.data) {
                notifications.show({ message: "Data received successfully!", color: "green" });
                console.log("Received Data:", result.data);
                // Could open a modal to show data
                setSelectedCredential({ credentialData: result.data }); // Reuse modal for now
                open();
            } else {
                notifications.show({ message: "Request sent, pending approval.", color: "blue" });
            }
        } catch (error) {
            console.error(error);
            notifications.show({ message: "Error requesting data", color: "red" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: "20px", width: "100%" }}>
            <Flex gap="md" mb="lg">
                <Button
                    variant={activeTab === "request" ? "filled" : "outline"}
                    onClick={() => setActiveTab("request")}
                >
                    Request Access
                </Button>
                <Button
                    variant={activeTab === "credentials" ? "filled" : "outline"}
                    onClick={() => setActiveTab("credentials")}
                >
                    My Credentials
                </Button>
            </Flex>

            {activeTab === "request" && (
                <Card withBorder padding="lg" radius="md">
                    <Title order={3} mb="md">Request Access from Patient</Title>
                    <Stack>
                        <TextInput
                            label="Patient DID (Maya)"
                            placeholder="did:ethr:..."
                            value={recipientDID}
                            onChange={(e) => setRecipientDID(e.currentTarget.value)}
                        />
                        <TextInput
                            label="Scope"
                            placeholder="e.g. medicalHistory"
                            value={scope}
                            onChange={(e) => setScope(e.currentTarget.value)}
                        />
                        <TextInput
                            label="Purpose"
                            placeholder="e.g. continuityOfCare"
                            value={purpose}
                            onChange={(e) => setPurpose(e.currentTarget.value)}
                        />
                        <TagsInput
                            label="Audience (Target Systems)"
                            placeholder="Enter DIDs and press Enter"
                            data={["did:shp", "did:ahp"]}
                            value={audience}
                            onChange={setAudience}
                        />
                        <TextInput
                            label="Expiry (Optional)"
                            placeholder="YYYY-MM-DD"
                            value={expiry}
                            onChange={(e) => setExpiry(e.currentTarget.value)}
                        />
                        <Button onClick={handleRequest} loading={loading}>Send Request</Button>
                    </Stack>
                </Card>
            )}

            {activeTab === "credentials" && (
                <Stack>
                    {credentials.length === 0 ? (
                        <Text>No credentials found.</Text>
                    ) : (
                        credentials.map((cred) => (
                            <Card key={cred.vcID} withBorder padding="lg" radius="md">
                                <Flex justify="space-between" align="center" mb="sm">
                                    <Title order={4}>Delegation VC</Title>
                                    <Badge color="green">Active</Badge>
                                </Flex>
                                <Text size="sm" mb="xs"><strong>Issuer:</strong> {cred.issuerDID}</Text>
                                <Text size="sm" mb="xs"><strong>Received:</strong> {new Date(cred.receivedAt).toLocaleString()}</Text>
                                <Text size="sm" mb="xs"><strong>Type:</strong> {cred.type}</Text>
                                <Group mt="md">
                                    <Button variant="light" size="xs" onClick={() => openDetails(cred)}>
                                        View Details
                                    </Button>
                                    <Button variant="filled" size="xs" color="blue" onClick={() => handleDataAccess(cred.vcID)} loading={loading}>
                                        Request Data
                                    </Button>
                                </Group>
                            </Card>
                        ))
                    )}
                </Stack>
            )}

            <Modal opened={opened} onClose={close} title="Credential Details" size="lg">
                {selectedCredential && (
                    <Stack>
                        <Text size="sm"><strong>VC ID:</strong> {selectedCredential.vcID}</Text>
                        <Text size="sm"><strong>Issuer:</strong> {selectedCredential.issuerDID}</Text>
                        <Text size="sm"><strong>Type:</strong> {selectedCredential.type}</Text>
                        <Text size="sm"><strong>Received At:</strong> {new Date(selectedCredential.receivedAt).toLocaleString()}</Text>
                        <Text size="sm" mt="md"><strong>Raw Data:</strong></Text>
                        <ScrollArea h={300}>
                            <Code block>{JSON.stringify(selectedCredential.credentialData, null, 2)}</Code>
                        </ScrollArea>
                    </Stack>
                )}
            </Modal>
        </div>
    );
}
