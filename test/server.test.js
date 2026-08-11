import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const port = 4319;
const server = spawn(process.execPath, ["src/server.js"], { cwd: new URL("..", import.meta.url), env: { ...process.env, PORT: String(port) }, stdio: ["ignore", "pipe", "pipe"] });
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("demo server did not start")), 5000);
  server.stdout.once("data", () => { clearTimeout(timer); resolve(); });
  server.once("exit", (code) => reject(new Error(`demo server exited ${code}`)));
});

test("serves a disabled 1-sat payment demo", async () => {
  const response = await fetch(`http://127.0.0.1:${port}/`);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /One sat/);
  assert.match(html, /PAYMENT TEST NOT STARTED/);
  assert.match(html, /button disabled/);
});

test("exposes a health endpoint", async () => {
  const response = await fetch(`http://127.0.0.1:${port}/health`);
  assert.deepEqual(await response.json(), { service: "gate-client-example", status: "ok" });
});

test.after(() => server.kill("SIGTERM"));
