import { Request, Response } from "express";
import { agent, db } from "./server.js";
import { fetchFirst } from "../ipfsRegister.js";
import { sendDIDCommMessage } from "../didcomm.js";

export async function requestDataAccess(req: Request, res: Response) {
    const { delegationVcId, targetDID } = req.body;
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] Requesting data access from ${targetDID} using VC ${delegationVcId}...`);

    try {
        // 1. Fetch Delegation VC
        const row = await fetchFirst(
            db,
            `SELECT credential FROM held_credentials WHERE vcID = ?`,
            [delegationVcId]
        ) as { credential: string };

        if (!row || !row.credential) {
            throw new Error("Delegation VC not found");
        }

        const delegationVC = JSON.parse(row.credential);

        // 2. Create VP
        const holderDID = (await agent.didManagerGetByAlias({ alias: "default" })).did;

        const vp = await agent.createVerifiablePresentation({
            presentation: {
                holder: holderDID,
                verifiableCredential: [delegationVC],
                type: ["VerifiablePresentation"],
            },
            proofFormat: "jwt",
            challenge: "data-access-request",
        });

        // 3. Send to Target (SHP)
        // We assume target has a "request-data-access" endpoint or we use DIDComm
        // Let's try HTTP for now as we defined a route in Issuer
        // But we need to know the URL. 
        // If targetDID is did:web:localhost%3A3004, we can derive it.
        // Or we use DIDComm if they have a service endpoint.

        // Let's try DIDComm first if possible, but our Issuer implementation used a direct route /request-data-access
        // which is not standard DIDComm service.
        // So let's use a direct fetch to localhost:3004 for this demo, assuming SHP is on 3004.

        // In a real system, we'd resolve the DID to find the service endpoint.
        // Let's assume we know it's http://localhost:3004/request-data-access

        const response = await fetch("http://localhost:3004/request-data-access", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ vp })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to request data: ${errorText}`);
        }

        const result = await response.json();

        // 4. Handle Response (VP with data)
        if (result.vp) {
            // Verify the response VP
            const verifiedResponse = await agent.verifyPresentation({ presentation: result.vp });
            if (!verifiedResponse.verified) {
                throw new Error("Response VP verification failed");
            }

            // Store the data?
            // For now just return it to frontend
            res.status(200).json({ message: "Data received", data: result.vp });
        } else {
            res.status(200).json({ message: "Request sent, no data returned immediately" });
        }

    } catch (error) {
        console.error(`[${timestamp}] Error requesting data access:`, error);
        res.status(500).json({
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
}
