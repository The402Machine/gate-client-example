import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";

import { bodyDigest, verifyReceipt } from "../src/gate-receipt.js";

const port = 4319;
const server = spawn(process.execPath, ["src/server.js"], { cwd: new URL("..", import.meta.url), env: { ...process.env, PORT: String(port) }, stdio: ["ignore", "pipe", "pipe"] });
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("demo server did not start")), 5000);
  server.stdout.once("data", () => { clearTimeout(timer); resolve(); });
  server.once("exit", (code) => reject(new Error(`demo server exited ${code}`)));
});

test("serves the explicit 1-sat payment demo", async () => {
  const response = await fetch(`http://127.0.0.1:${port}/`);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /One sat/);
  assert.match(html, /CREATE 1-SAT INVOICE/);
  assert.match(html, /pay@mikelcalvo\.net/);
});

test("does not create an invoice when the server is not configured", async () => {
  const response = await fetch(`http://127.0.0.1:${port}/api/demo/start`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  assert.equal(response.status, 503);
});

test("exposes a health endpoint without secrets", async () => {
  const response = await fetch(`http://127.0.0.1:${port}/health`);
  assert.deepEqual(await response.json(), { service: "gate-client-example", status: "ok", gateConfigured: false });
});

test("hashes exact request bytes", () => {
  assert.equal(bodyDigest(Buffer.alloc(0)), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
});

test("fails closed on an invalid signed receipt", () => {
  const { publicKey } = generateKeyPairSync("ed25519");
  assert.throws(() => verifyReceipt({ receipt: randomBytes(40).toString("base64url"), publicKey, issuer: "https://the402machine.com", keyId: "key", projectId: "project", routeId: "route", method: "POST", path: "/api/demo", body: Buffer.alloc(0) }), /Invalid GATE receipt/);
});

test.after(() => server.kill("SIGTERM"));
