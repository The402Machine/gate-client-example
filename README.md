# GATE client example

Controlled public demo for `gatedemo.the402machine.com`.

The final route costs **1 sat** and demonstrates:

1. a request-bound HTTP 402 challenge;
2. direct payment to the configured merchant Lightning Address;
3. cryptographic payer proof;
4. local verification of the signed GATE receipt;
5. delivery of a synthetic demo response.

The payment action intentionally remains disabled until the parent GATE deployment has passed its transport, contract, security and production gates. No project capability or signing material belongs in this repository.

## Local preview

```bash
npm test
npm start
```

Open `http://127.0.0.1:4130`.

## Security boundary

- No custody or forwarding of sats.
- No project capabilities in browser JavaScript.
- The server-side demo client will hold its project capability in an untracked production environment.
- The route will be fixed at `POST /api/demo` and `1 sat`.
- A quote is created only after the user explicitly starts the payment test.
- Wallet success never substitutes for backend cryptographic verification.
