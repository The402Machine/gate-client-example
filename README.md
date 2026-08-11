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

```bash
npm test
npm start
```

Open `http://127.0.0.1:4130`.

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
