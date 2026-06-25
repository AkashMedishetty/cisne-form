import { SignJWT, jwtVerify } from "jose";

// Name of the cookie that holds the admin session JWT.
export const SESSION_COOKIE = "cisne_admin";

const ISSUER = "cisne";
const AUDIENCE = "cisne-admin";

function getSecret(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "ADMIN_SESSION_SECRET is not set (or too short). Add a long random string to your environment.",
    );
  }
  return new TextEncoder().encode(secret);
}

/** Create a signed session token valid for the given number of days. */
export async function createSessionToken(days = 7): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(`${days}d`)
    .sign(getSecret());
}

/** Verify a session token. Returns true only for a valid, unexpired admin token. */
export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    return payload.role === "admin";
  } catch {
    return false;
  }
}

/**
 * Constant-time-ish password comparison. Avoids leaking length/early-exit timing
 * for the common case. Not a substitute for hashing, but fine for a single
 * shared admin password compared server-side.
 */
export function passwordMatches(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    throw new Error("ADMIN_PASSWORD is not set. Add it to your environment.");
  }
  if (input.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= input.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}
