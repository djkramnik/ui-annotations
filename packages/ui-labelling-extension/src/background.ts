chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.cmd === 'hard-refresh' && sender.tab?.id !== undefined) {
    chrome.tabs.reload(sender.tab.id, { bypassCache: true });
  }
});