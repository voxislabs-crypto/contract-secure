(function injectSecureDealButton() {
  const BUTTON_ID = "contract-secure-floating-button";
  const DEFAULT_BASE_URL = "http://localhost:5173";

  function shouldInject() {
    const host = window.location.hostname;
    const path = window.location.pathname;

    if (host.includes("facebook.com") && path.includes("/marketplace/")) {
      return true;
    }

    if (host.includes("craigslist.org")) {
      const listingPathRegex = /\/(d|cto|cta|apa|for-sale)\//;
      return listingPathRegex.test(path);
    }

    return false;
  }

  async function resolveBaseUrl() {
    try {
      const result = await chrome.storage.sync.get(["appBaseUrl"]);
      return (result.appBaseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
    } catch {
      return DEFAULT_BASE_URL;
    }
  }

  function createButton() {
    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.textContent = "Secure Deal";
    button.style.position = "fixed";
    button.style.right = "16px";
    button.style.bottom = "16px";
    button.style.zIndex = "2147483647";
    button.style.border = "none";
    button.style.borderRadius = "999px";
    button.style.padding = "10px 14px";
    button.style.background = "#0f172a";
    button.style.color = "#ffffff";
    button.style.fontSize = "14px";
    button.style.fontWeight = "600";
    button.style.cursor = "pointer";
    button.style.boxShadow = "0 8px 24px rgba(15, 23, 42, 0.25)";
    button.style.fontFamily = "Segoe UI, Tahoma, Geneva, Verdana, sans-serif";
    button.style.transition = "transform 120ms ease";

    button.addEventListener("mouseenter", () => {
      button.style.transform = "translateY(-1px)";
    });

    button.addEventListener("mouseleave", () => {
      button.style.transform = "translateY(0)";
    });

    button.addEventListener("click", async () => {
      const baseUrl = await resolveBaseUrl();
      const target = new URL(`${baseUrl}/secure-deal.html`);
      target.searchParams.set("source", "injected-button");
      target.searchParams.set("listingUrl", window.location.href);
      target.searchParams.set("listingTitle", document.title || "");
      window.open(target.toString(), "_blank", "noopener,noreferrer");
    });

    return button;
  }

  function mount() {
    if (!shouldInject()) return;
    if (document.getElementById(BUTTON_ID)) return;
    if (!document.body) return;
    document.body.appendChild(createButton());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
})();