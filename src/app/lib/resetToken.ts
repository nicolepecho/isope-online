import crypto from "crypto";

const TOKEN_TTL_MINUTES = 30;

const toBase64Url = (input: Buffer | string) =>
  Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const fromBase64Url = (input: string) => {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4 ? "=".repeat(4 - (normalized.length % 4)) : "";
  return Buffer.from(`${normalized}${pad}`, "base64").toString("utf-8");
};

const getSecret = () => {
  const secret = process.env.RESET_PASSWORD_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("RESET_PASSWORD_SECRET or NEXTAUTH_SECRET must be set");
  }
  return secret;
};

export const createPasswordResetToken = (email: string) => {
  const expiresAt = Date.now() + TOKEN_TTL_MINUTES * 60 * 1000;
  const emailPart = toBase64Url(email);
  const payload = `${emailPart}.${expiresAt}`;
  const signature = toBase64Url(
    crypto.createHmac("sha256", getSecret()).update(payload).digest()
  );
  return `${payload}.${signature}`;
};

export const verifyPasswordResetToken = (token: string) => {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [emailPart, expiresPart, signature] = parts;
  const expiresAt = Number(expiresPart);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;

  const payload = `${emailPart}.${expiresPart}`;
  const expected = toBase64Url(
    crypto.createHmac("sha256", getSecret()).update(payload).digest()
  );

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    sigBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    return null;
  }

  return fromBase64Url(emailPart);
};
