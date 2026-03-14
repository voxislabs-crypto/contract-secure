const DEFAULT_BASE_URL = "http://localhost:5173";

const appBaseUrlInput = document.getElementById("appBaseUrl");
const saveBtn = document.getElementById("saveBtn");
const statusEl = document.getElementById("status");

function normalizeBaseUrl(url) {
  if (!url) return DEFAULT_BASE_URL;
  const trimmed = url.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withProtocol.replace(/\/$/, "");
}

async function loadSettings() {
  const { appBaseUrl } = await chrome.storage.sync.get(["appBaseUrl"]);
  appBaseUrlInput.value = appBaseUrl || DEFAULT_BASE_URL;
}

async function saveSettings() {
  const normalized = normalizeBaseUrl(appBaseUrlInput.value);
  await chrome.storage.sync.set({ appBaseUrl: normalized });
  appBaseUrlInput.value = normalized;
  statusEl.textContent = "Settings saved.";
}

saveBtn.addEventListener("click", () => {
  saveSettings().catch((err) => {
    statusEl.textContent = `Save failed: ${err?.message || "Unknown error"}`;
  });
});

loadSettings().catch((err) => {
  statusEl.textContent = `Load failed: ${err?.message || "Unknown error"}`;
});