import { Request, Response } from "express";
import { sendDIDCommMessage } from "../didcomm.js";
import { agent } from "./server.js";

export async function requestDelegation(req: Request, res: Response) {
    const { recipientDID, scope, purpose, audience, expiry } = req.body;
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] Requesting delegation from ${recipientDID}...`);

    try {
        const issuerDID = (await agent.didManagerGetByAlias({ alias: "default" }))
            .did;

        const message = {
            type: "https://didcomm.org/present-proof/3.0/request-presentation",
            body: {
                scope,
                purpose,
                audience,
                expiry,
                requesterDID: issuerDID,
            },
        };

        await sendDIDCommMessage(
            issuerDID,
            recipientDID,
            message,
            "DelegationRequest", // Service type
            "authcrypt"
        );

        res.status(200).json({ message: "Delegation request sent successfully" });
    } catch (error) {
        console.error(`[${timestamp}] Error requesting delegation:`, error);
        res.status(500).json({
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
}
