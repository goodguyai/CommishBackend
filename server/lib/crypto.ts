import nacl from "tweetnacl";

export function verifyDiscordSignature(
  signature: string,
  timestamp: string,
  body: string,
  publicKey: string
): boolean {
  try {
    const timestampBuffer = Buffer.from(timestamp, "utf8");
    const bodyBuffer = Buffer.from(body, "utf8");
    const message = Buffer.concat([timestampBuffer, bodyBuffer]);
    
    const signatureBuffer = Buffer.from(signature, "hex");
    const publicKeyBuffer = Buffer.from(publicKey, "hex");
    
    return nacl.sign.detached.verify(message, signatureBuffer, publicKeyBuffer);
  } catch (error) {
    console.error("Discord signature verification failed:", error);
    return false;
  }
}

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2)}`;
}
