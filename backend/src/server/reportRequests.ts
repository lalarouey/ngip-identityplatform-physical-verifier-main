import { Request, Response } from 'express';
import { Server, Socket } from 'socket.io';
import { resolveDIDCommMessage, sendDIDCommMessage } from '../didcomm.js';
import { TReport } from 'types.js';
export async function handleReport(io: Server, req: Request, res: Response) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Received abuse report from issuer`);

  try {
    const unpackedMessage = await resolveDIDCommMessage(req.body);
    const senderDID = unpackedMessage.message.from;
    const report = unpackedMessage.message.body as TReport;

    if (!report || !report.holderDID || !report.vcID || !report.description) {
      console.error(`[${timestamp}] Invalid report payload`);
      return res.status(400).send('Invalid report format');
    }

    res.status(200).send('Report received by Physical Verifier');

    io.emit('physical-verifier-report', {
      senderDID,
      ...report,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${timestamp}] Error handling report:`, errorMessage);
    res.status(500).send(errorMessage);
  }
}

export async function sendIdentityToIssuer(
  socket: Socket | null,
  verifierDID: string,
  issuerDID: string,
  identity: Record<string, any>,
) {
  try {
    await sendDIDCommMessage(
      verifierDID,
      issuerDID,
      identity,
      'discloseIdentity',
      'authcrypt',
    );
    console.log(
      `[${new Date().toISOString()}] Identity sent to issuer: ${issuerDID}`,
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `[${new Date().toISOString()}] Error sending identity:`,
      errorMessage,
    );
    if(socket) socket.emit('custom-error', {title: "Failed to send Identity", errorMessage});
    throw socket;
  }
}
