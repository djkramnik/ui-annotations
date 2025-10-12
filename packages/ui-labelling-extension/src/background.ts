import { ExtensionMessage } from "./types";

chrome.runtime.onMessage.addListener(
  async (message: { type: string; content: Record<string, any> }) => {
    switch (message.type) {
      case 'adhoc_screen':
        try {
          fetch('http://localhost:4000/api/annotation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...message.content,
              screenshot: (await chrome.tabs.captureVisibleTab()).split(
                ';base64,',
              )[1],
            }),
          }).then((response) => {
            if (response.ok) {
              sendMessage(ExtensionMessage.exportSuccess)
              return
            }
            throw `Bad status: ${response.status}`
          })
        } catch (e) {
          sendMessage(ExtensionMessage.exportFailed)
          console.error('could not export', e)
        }

        break
    }
  },
)

function sendMessage(
  type: string,
  options?: {
    cb?: () => void
    content?: Record<string, any>
  },
) {
  return chrome.tabs.query(
    { active: true, currentWindow: true },
    async (tabs) => {
      if (typeof tabs[0]?.id !== 'number') {
        return
      }
      await chrome.tabs.sendMessage(tabs[0].id, {
        type,
        content: options?.content ?? null,
      })
      options?.cb?.()
    },
  )
}
