import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const port = Number(process.env.PORT ?? 4130);
const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");

createServer((request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    response.end(JSON.stringify({ service: "gate-client-example", status: "ok" }));
    return;
  }
  if (request.method === "GET" && (request.url === "/" || request.url === "/index.html")) {
    response.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      "cache-control": "no-store",
    });
    response.end(html);
    return;
  }
  response.writeHead(404, { "content-type": "application/json", "cache-control": "no-store" });
  response.end(JSON.stringify({ error: "not found" }));
}).listen(port, "0.0.0.0", () => console.log(`gate-client-example listening on ${port}`));
