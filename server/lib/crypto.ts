import nacl from "tweetnacl";
import { createHash } from "crypto";

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

export function generateContentHash(content: string, model?: string, dimensions?: number): string {
  const normalizedContent = content.trim().replace(/\r\n/g, '\n');
  const hashInput = model && dimensions 
    ? `${model}:${dimensions}:${normalizedContent}`
    : normalizedContent;
  return createHash('sha256').update(hashInput).digest('hex');
}
