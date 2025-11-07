import { ScreenshotRequest } from "ui-labelling-shared";
import type { Msg } from "./types";

chrome.runtime.onMessage.addListener((msg: Msg, sender, sendResponse) => {
  if (msg?.type === "CAPTURE_VISIBLE_TAB") {
    const winId = sender.tab?.windowId;
    if (winId == null) {
      sendResponse({ ok: false, error: "No window id" });
      return true;
    }
    chrome.tabs.captureVisibleTab(winId, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError || !dataUrl) {
        sendResponse({ ok: false, error: chrome.runtime.lastError?.message || "capture failed" });
      } else {
        sendResponse({ ok: true, dataUrl });
      }
    });
    return true;
  }

  if (msg?.type === "POST_SCREENSHOT") {
    (async () => {
      try {
        const payload: ScreenshotRequest = msg.payload;
        const res = await fetch("http://localhost:4000/api/screenshot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        sendResponse({ ok: true });
      } catch (e: any) {
        sendResponse({ ok: false, error: e?.message || String(e) });
      }
    })();
    return true; // keep channel open for async sendResponse
  }
});
