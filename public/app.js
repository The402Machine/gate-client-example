const button = document.querySelector("button");
const status = document.querySelector(".status");
const invoice = document.querySelector(".invoice");
const preimage = document.querySelector("#preimage");
const prove = document.querySelector("#prove");
const poll = document.querySelector("#poll");
let sessionId = null;

async function request(path, body = {}) {
  const response = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json();
  if (!response.ok && response.status !== 402) throw new Error(payload.error ?? `HTTP ${response.status}`);
  return payload;
}

button.addEventListener("click", async () => {
  button.disabled = true;
  status.textContent = "Requesting one real 1-sat invoice from the merchant wallet...";
  try {
    const challenge = await request("/api/demo/start");
    sessionId = challenge.sessionId;
    invoice.textContent = challenge.bolt11;
    invoice.hidden = false;
    preimage.hidden = false;
    prove.hidden = false;
    poll.hidden = false;
    status.textContent = "Invoice created. Pay exactly 1 sat, then submit the wallet preimage or poll if the provider supports cryptographic verification.";
  } catch (error) {
    status.textContent = error.message;
    button.disabled = false;
  }
});

prove.addEventListener("click", async () => {
  try {
    status.textContent = "Verifying payer proof and signed GATE receipt...";
    const result = await request("/api/demo/prove", { sessionId, preimage: preimage.value.trim().toLowerCase() });
    status.textContent = result.authorized ? result.message : `Still pending: ${result.state}`;
  } catch (error) { status.textContent = error.message; }
});

poll.addEventListener("click", async () => {
  try {
    status.textContent = "Checking provider settlement proof...";
    const result = await request("/api/demo/poll", { sessionId });
    status.textContent = result.authorized ? result.message : `Still pending: ${result.state}`;
  } catch (error) { status.textContent = error.message; }
});
