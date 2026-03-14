const DEFAULT_BASE_URL = "http://localhost:5173";

const appBaseUrlInput = document.getElementById("appBaseUrl");
const saveBtn = document.getElementById("saveBtn");
const openBtn = document.getElementById("openBtn");
const statusEl = document.getElementById("status");

function normalizeBaseUrl(url) {
  if (!url) return DEFAULT_BASE_URL;
  const trimmed = url.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withProtocol.replace(/\/$/, "");
}

function setStatus(message) {
  statusEl.textContent = message;
}

async function loadBaseUrl() {
  const { appBaseUrl } = await chrome.storage.sync.get(["appBaseUrl"]);
  appBaseUrlInput.value = appBaseUrl || DEFAULT_BASE_URL;
}

async function saveBaseUrl() {
  const normalized = normalizeBaseUrl(appBaseUrlInput.value);
  await chrome.storage.sync.set({ appBaseUrl: normalized });
  appBaseUrlInput.value = normalized;
  setStatus("Saved.");
}

async function openSecureDeal() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) {
    setStatus("Could not read current tab URL.");
    return;
  }

  const normalized = normalizeBaseUrl(appBaseUrlInput.value);
  const target = new URL(`${normalized}/secure-deal.html`);
  target.searchParams.set("source", "extension-popup");
  target.searchParams.set("listingUrl", tab.url);
  if (tab.title) target.searchParams.set("listingTitle", tab.title);

  await chrome.tabs.create({ url: target.toString() });
  window.close();
}

saveBtn.addEventListener("click", () => {
  saveBaseUrl().catch((err) => setStatus(`Save failed: ${err?.message || "Unknown error"}`));
});

openBtn.addEventListener("click", () => {
  openSecureDeal().catch((err) => setStatus(`Open failed: ${err?.message || "Unknown error"}`));
});

loadBaseUrl().catch((err) => setStatus(`Load failed: ${err?.message || "Unknown error"}`));