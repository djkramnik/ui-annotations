console.log('Hello from background script!')

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed')
})