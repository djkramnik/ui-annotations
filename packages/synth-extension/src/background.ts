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
    return true; // keep channel open for async reply
  }
});
