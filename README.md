# GATE client example

Controlled public demo for `gatedemo.the402machine.com`.

The final route costs **1 sat** and demonstrates:

1. a request-bound HTTP 402 challenge;
2. direct payment to the configured merchant Lightning Address;
3. cryptographic payer proof;
4. local verification of the signed GATE receipt;
5. delivery of a synthetic demo response.

The server-side payment action is fail-closed unless all project and receipt-verification settings are present. No project capability or signing material belongs in this repository. Creating a challenge creates one real invoice for exactly 1 sat; loading the page and running health checks never create invoices.

## Local preview

Use Node.js 22 LTS. This example has **no npm dependencies**: it uses Node built-ins and browser APIs. No `npm install`, lockfile, or registry audit is needed while that remains true.

```bash
npm test
npm start
```

Open `http://127.0.0.1:4130`. The test server explicitly clears payment configuration and uses a loopback-only GATE URL, even if the parent shell has production settings.

## Runtime maintenance

The Dockerfile pins Node.js **22.23.4** on Alpine **3.24** by its multi-platform image digest so rebuilds cannot silently change the runtime or base OS. Node 22 is in Maintenance LTS until **2027-04-30**; plan a separately tested move to a supported LTS major before then.

For each maintenance update:

1. Check the [latest Node 22 release](https://nodejs.org/dist/latest-v22.x/) and [support schedule](https://github.com/nodejs/Release#release-schedule).
2. Pull the supported `node:22-alpine` image, inspect its runtime/Alpine versions and `RepoDigests`, then update the Dockerfile's versioned tag and digest together. A digest pin needs deliberate refreshes for security fixes, including base-image rebuilds with an unchanged Node version.
3. Run the full `npm test` suite on that Node 22 image and build the actual Dockerfile with `docker build --pull -t gate-client-example:verify .`.
4. Smoke-test the built image without production environment files and with `--network none`: health, HTML, and JavaScript must work, and `POST /api/demo/start` must return `503`. Do not use a configured challenge route as a health check: it creates a real invoice.

## Container deployment

```bash
docker compose config --quiet
docker compose up -d --build
curl --fail http://127.0.0.1:4130/health
```

The versioned Nginx vhost is in `deploy/gatedemo.the402machine.com.conf`. Install it only after DNS resolves to the host and Certbot has issued the hostname certificate.

## Production settings

```text
GATE_BASE_URL=https://the402machine.com
GATE_PROJECT_ID=gate_project_...
GATE_PROJECT_KEY=[server-side capability]
GATE_ROUTE_ID=[persisted route UUID]
GATE_RECEIPT_KEY_ID=[published JWKS kid]
```

## Security boundary

- No custody or forwarding of sats.
- No project capabilities in browser JavaScript.
- The server-side demo client will hold its project capability in an untracked production environment.
- The route will be fixed at `POST /api/demo` and `1 sat`.
- A quote is created only after the user explicitly starts the payment test.
- Wallet success never substitutes for backend cryptographic verification.
