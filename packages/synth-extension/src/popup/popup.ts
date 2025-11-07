import type { Msg } from "../types";

const btn = document.getElementById("exportBtn") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLDivElement;

function setStatus(t: string) { statusEl.textContent = t; }

btn.addEventListener("click", async () => {
  btn.disabled = true; setStatus("Exporting…");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active tab");

    await chrome.tabs.sendMessage(tab.id, { type: "START_EXPORT" } satisfies Msg);
    setStatus("Done.");
  } catch (e: any) {
    setStatus("Error: " + (e?.message || e));
  } finally {
    btn.disabled = false;
  }
});
