import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

import { publicKeyFromJwk, verifyReceipt } from "./gate-receipt.js";

const port = Number(process.env.PORT ?? 4130);
const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const gateBaseUrl = new URL(process.env.GATE_BASE_URL ?? "https://the402machine.com");
const projectId = process.env.GATE_PROJECT_ID ?? "";
const projectKey = process.env.GATE_PROJECT_KEY ?? "";
const routeId = process.env.GATE_ROUTE_ID ?? "";
const routeKey = "demo";
const routeMethod = "POST";
const routePath = "/api/demo";
const receiptKeyId = process.env.GATE_RECEIPT_KEY_ID ?? "";
const configured = [projectId, projectKey, routeId, receiptKeyId].every(Boolean);
let receiptPublicKey = null;
const sessions = new Map();

function json(response, status, body, headers = {}) {
  response.writeHead(status, { "content-type": "application/json", "cache-control": "no-store", ...headers });
  response.end(JSON.stringify(body));
}

function commonHeaders(idempotencyKey) {
  return {
    authorization: `Bearer ${projectKey}`,
    "idempotency-key": idempotencyKey,
    "x-gate-project": projectId,
    "x-gate-route": routeKey,
    "x-gate-method": routeMethod,
    "x-gate-path": routePath,
  };
}

async function parseJson(request, maxBytes = 4096) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw new Error("request too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function publicKey() {
  if (receiptPublicKey) return receiptPublicKey;
  const response = await fetch(new URL("/.well-known/gate-jwks.json", gateBaseUrl), { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error("GATE verification key is unavailable");
  const jwks = await response.json();
  const jwk = jwks.keys?.find((key) => key.kid === receiptKeyId);
  receiptPublicKey = publicKeyFromJwk(jwk);
  return receiptPublicKey;
}

async function finish(session, gateResponse, response) {
  const payload = await gateResponse.json();
  if (gateResponse.status === 402) return json(response, 402, { pending: true, state: payload.state ?? "invoice_issued" });
  if (!gateResponse.ok) throw new Error(`GATE returned HTTP ${gateResponse.status}`);
  const receipt = gateResponse.headers.get("gate-receipt") ?? payload.receipt;
  const claims = verifyReceipt({ receipt, publicKey: await publicKey(), issuer: gateBaseUrl.origin, keyId: receiptKeyId, projectId, routeId, method: routeMethod, path: routePath, body: Buffer.alloc(0) });
  sessions.delete(session.id);
  return json(response, 200, { authorized: true, message: "One real sat authorized this exact demo request.", receiptJti: claims.jti, paymentHash: claims.payment_hash });
}

createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/health") return json(response, 200, { service: "gate-client-example", status: "ok", gateConfigured: configured });
    if (request.method === "GET" && (request.url === "/" || request.url === "/index.html")) {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; script-src 'self'; connect-src 'self'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'", "cache-control": "no-store" });
      return response.end(html);
    }
    if (request.method === "GET" && request.url === "/app.js") {
      const script = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
      response.writeHead(200, { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" });
      return response.end(script);
    }
    if (request.method === "POST" && request.url === "/api/demo/start") {
      if (!configured) return json(response, 503, { error: "Demo payment is not enabled" });
      const session = { id: randomUUID(), idempotencyKey: `gatedemo-${randomUUID()}`, intentId: null };
      const gateResponse = await fetch(new URL("/api/gate/intents", gateBaseUrl), { method: "POST", headers: commonHeaders(session.idempotencyKey), body: Buffer.alloc(0), signal: AbortSignal.timeout(10000) });
      const payload = await gateResponse.json();
      if (gateResponse.status !== 402 || payload.amountSats !== 1 || typeof payload.bolt11 !== "string") throw new Error("GATE did not return the expected 1-sat challenge");
      session.intentId = payload.intentId;
      sessions.set(session.id, session);
      return json(response, 402, { sessionId: session.id, amountSats: 1, bolt11: payload.bolt11, expiresAt: payload.expiresAt, verification: payload.verification });
    }
    if (request.method === "POST" && request.url === "/api/demo/prove") {
      const input = await parseJson(request);
      const session = sessions.get(input.sessionId);
      if (!session || typeof input.preimage !== "string" || !/^[a-f0-9]{64}$/.test(input.preimage)) return json(response, 400, { error: "Invalid demo proof" });
      const gateResponse = await fetch(new URL(`/api/gate/intents/${encodeURIComponent(session.intentId)}/prove`, gateBaseUrl), { method: "POST", headers: { ...commonHeaders(session.idempotencyKey), "content-type": "application/json" }, body: JSON.stringify({ preimage: input.preimage }), signal: AbortSignal.timeout(10000) });
      return await finish(session, gateResponse, response);
    }
    if (request.method === "POST" && request.url === "/api/demo/poll") {
      const input = await parseJson(request);
      const session = sessions.get(input.sessionId);
      if (!session) return json(response, 400, { error: "Invalid demo session" });
      const gateResponse = await fetch(new URL(`/api/gate/intents/${encodeURIComponent(session.intentId)}`, gateBaseUrl), { headers: commonHeaders(session.idempotencyKey), signal: AbortSignal.timeout(10000) });
      return await finish(session, gateResponse, response);
    }
    return json(response, 404, { error: "not found" });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return json(response, 502, { error: "The controlled GATE demo could not complete the request" });
  }
}).listen(port, "0.0.0.0", () => console.log(`gate-client-example listening on ${port}`));
