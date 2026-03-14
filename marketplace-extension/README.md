# Contract Secure Marketplace Extension Stub

This folder contains a minimal Chrome extension prototype for Facebook Marketplace and Craigslist.

## What it does

- Adds a floating "Secure Deal" button on supported listing pages.
- Provides a popup action to open the Contract Secure intake flow from the active tab.
- Passes listing URL/title into query parameters.

## Local test

1. Open Chrome and go to `chrome://extensions`.
2. Enable Developer Mode.
3. Click "Load unpacked" and select this `marketplace-extension/` folder.
4. In the extension popup, set `App Base URL` to your dev URL, usually `http://localhost:5173`.
5. Visit a Marketplace/Craigslist listing and click the injected "Secure Deal" button.

## Notes

- This is intentionally a stub for rapid testing.
- Payment processing and PDF generation stay in your web app flow.