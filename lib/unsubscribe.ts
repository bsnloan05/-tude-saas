import { createHmac, timingSafeEqual } from "crypto";

// Jeton de désinscription : signé avec un secret serveur pour qu'on ne puisse
// pas désabonner quelqu'un d'autre en devinant son identifiant, sans avoir
// besoin qu'il soit connecté pour cliquer sur le lien depuis son email.
export function generateUnsubscribeToken(userId: string): string {
  return createHmac("sha256", process.env.UNSUBSCRIBE_SECRET!)
    .update(userId)
    .digest("hex");
}

export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  const expected = generateUnsubscribeToken(userId);
  const expectedBuffer = Buffer.from(expected);
  const tokenBuffer = Buffer.from(token);
  if (expectedBuffer.length !== tokenBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, tokenBuffer);
}
