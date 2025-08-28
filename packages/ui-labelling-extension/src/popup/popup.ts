
import { AnnotationLabel } from "ui-labelling-shared"
import { ExtensionMessage, PredictResponse } from "../types"

function getMessagePromise(message: string): Promise<void> {
  return new Promise(resolve => {
    sendMessage(message, { cb: () => { resolve() }})
  })
}

document.addEventListener('DOMContentLoaded', () => {
  // today copy to clipboard, tomorrow the world
  const exportBtn = document.getElementById('export-btn')
  const startBtn = document.getElementById('start-btn')
  const endBtn = document.getElementById('end-btn')
  const predictBtn = document.getElementById('predict-btn')
  const textRegionBtn = document.getElementById('text-region-btn')

  if (!exportBtn || !startBtn || !endBtn || !predictBtn || !textRegionBtn) {
    console.error('cannot get dom objects')
    return
  }

  function disableAllButtons() {
    predictBtn!.setAttribute('disabled', 'disabled')
    startBtn!.setAttribute('disabled', 'disabled')
    endBtn!.setAttribute('disabled', 'disabled')
    exportBtn!.setAttribute('disabled', 'disabled')
    textRegionBtn?.setAttribute('disabled', 'disabled')
  }

  textRegionBtn.addEventListener('click', async () => {
    sendMessage(ExtensionMessage.gatherTextRegions)
  })

  predictBtn.addEventListener('click', async () => {
    disableAllButtons()
    try {
      const screenshotUrl = await chrome.tabs.captureVisibleTab()
      const b64 = screenshotUrl.split(';base64,')[1]
      const res = await fetch("http://localhost:8000/predict_base64", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_base64: b64 }),
        });
      const { boxes, class_names, width: imgW, height: imgH } = await res.json() as PredictResponse;
      sendMessage(ExtensionMessage.predict, {
        content: {
          boxes,
          class_names,
          imgW,
          imgH
        }
      })
      window.close()
    } catch(e) {
      console.error('predict failed wtf', e)
    } finally {
    }
  })

  exportBtn.addEventListener('click', async () => {
    disableAllButtons()
    // clear the overlay, reset global state to initial
    await getMessagePromise('clean')
    exportBtn.setAttribute('disabled', 'disabled')
    const payload = await getExportPayload()

    console.log('PAYLOAD 2 EXPORT', payload)

    try {
      fetch('http://localhost:4000/api/annotation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      .then(response => {
        if (response.ok) {
          console.log('successful export', response)
          sendMessage(ExtensionMessage.exportSuccess)
          chrome.storage.local.clear()
          return
        }
        throw `Bad status: ${response.status}`
      })
    } catch(e) {
      sendMessage(ExtensionMessage.exportFailed)
      console.error('could not export', e)
    } finally {
      window.close()
    }
  })

  startBtn.addEventListener('click', async () => {
    disableAllButtons()
    sendMessage(ExtensionMessage.startMain, { cb: () => {
      window.close()
    }})
  })

  endBtn.addEventListener('click', async () => {
    sendMessage(ExtensionMessage.turnOffExtension, {
      cb: () => window.close()
    })
  })
})

function sendMessage(type: string, options?: {
  cb?: () => void, content?: Record<string, any>
}) {
  return chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    if (typeof tabs[0]?.id !== 'number') {
      return
    }
    await chrome.tabs.sendMessage(
      tabs[0].id,
      {
        type,
        content: options?.content ?? null
      })
    options?.cb?.()
  })
}

async function getExportPayload() {
  const obj = await chrome.storage.local.get(['annotations', 'meta'])

  const annotations = JSON.parse(obj['annotations']) as {
    id: string
    ref: HTMLElement
    rect: DOMRect
    label: AnnotationLabel
  }[]
  const meta = obj['meta'] as {
    url: string
    date: string
    window: {
      scrollY: number
      width: number
      height: number
    }
  }

  const screenshotUrl = await chrome.tabs.captureVisibleTab()
  const base64Image = screenshotUrl.split(';base64,')[1]

  return {
    annotations: annotations.map(({ref, ...rest}) => ({ ...rest})),
    screenshot: base64Image,
    ...meta
  }
}
