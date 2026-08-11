import { createHash, createPublicKey, verify } from "node:crypto";

export function bodyDigest(body) {
  return createHash("sha256").update(body).digest("hex");
}

export function publicKeyFromJwk(jwk) {
  if (jwk?.kty !== "OKP" || jwk?.crv !== "Ed25519" || typeof jwk.x !== "string") throw new Error("Invalid GATE public key");
  return createPublicKey({ key: jwk, format: "jwk" });
}

export function verifyReceipt({ receipt, publicKey, issuer, keyId, projectId, routeId, method, path, body, now = new Date() }) {
  const segments = receipt.split(".");
  if (segments.length !== 3) throw new Error("Invalid GATE receipt");
  const [encodedHeader, encodedClaims, encodedSignature] = segments;
  let header;
  let claims;
  try {
    header = JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8"));
    claims = JSON.parse(Buffer.from(encodedClaims, "base64url").toString("utf8"));
  } catch {
    throw new Error("Invalid GATE receipt");
  }
  if (header.alg !== "EdDSA" || header.typ !== "gate+jwt" || header.kid !== keyId) throw new Error("Invalid GATE receipt header");
  if (!verify(null, Buffer.from(`${encodedHeader}.${encodedClaims}`, "ascii"), publicKey, Buffer.from(encodedSignature, "base64url"))) throw new Error("Invalid GATE receipt signature");
  const current = Math.floor(now.getTime() / 1000);
  if (!Number.isSafeInteger(claims.iat) || !Number.isSafeInteger(claims.exp) || claims.iat > current + 30 || claims.exp <= current || claims.exp <= claims.iat || claims.exp - claims.iat > 300) throw new Error("Expired GATE receipt");
  const expected = {
    iss: issuer,
    aud: projectId,
    route: routeId,
    method: method.toUpperCase(),
    path,
    body_sha256: bodyDigest(body),
  };
  for (const [key, value] of Object.entries(expected)) if (claims[key] !== value) throw new Error(`GATE receipt ${key} mismatch`);
  if (claims.amount_sats !== 1 || typeof claims.payment_hash !== "string" || !/^[a-f0-9]{64}$/.test(claims.payment_hash) || typeof claims.jti !== "string") throw new Error("Invalid GATE receipt claims");
  return claims;
}
