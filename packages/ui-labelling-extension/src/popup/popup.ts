import { AnnotationPayload, AnnotationRequest } from 'ui-labelling-shared'
import { PredictResponse, ExtensionMessage, YoloPredictResponse } from '../types'
import { snooze } from '../util'

function getMessagePromise(message: string): Promise<void> {
  return new Promise((resolve) => {
    sendMessage(message, {
      cb: () => {
        resolve()
      },
    })
  })
}

document.addEventListener('DOMContentLoaded', () => {
  // today copy to clipboard, tomorrow the world
  const exportBtn = document.getElementById('export-btn')
  const startBtn = document.getElementById('start-btn')
  const endBtn = document.getElementById('end-btn')
  const predictBtn = document.getElementById('predict-btn')
  const textRegionBtn = document.getElementById('text-region-btn')
  const interactiveBtn = document.getElementById('interactive-btn')

  const btns = [
    exportBtn,
    startBtn,
    endBtn,
    predictBtn,
    textRegionBtn,
    interactiveBtn
  ]

  if (btns.some(b => !b)) {
    console.error('cannot get reference to popup button(s)!')
    return
  }

  function disableAllButtons() {
    btns.forEach(b => b?.setAttribute('disabled', 'disabled'))
  }

  interactiveBtn!.addEventListener('click', async () => {
    sendMessage(ExtensionMessage.gatherInteractiveRegions, {
      cb: () => window.close(),
    })
  })

  textRegionBtn!.addEventListener('click', async () => {
    sendMessage(ExtensionMessage.gatherTextRegions, {
      cb: () => window.close(),
    })
  })

  predictBtn!.addEventListener('click', async () => {
    disableAllButtons()
    try {
      const screenshotUrl = await chrome.tabs.captureVisibleTab()
      const b64 = screenshotUrl.split(';base64,')[1]
      const res = await fetch('http://localhost:8000/predict_textregions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: b64, conf: 0.1, imgsz: 1024 }),
      })
      const {
        detections,
        width,
        height,
      } = (await res.json()) as YoloPredictResponse
      console.log('response one', detections.length)
      const res2 = await fetch('http://localhost:4000/api/screenshot/clips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noScale: true, // important!
          rects: detections.map(d => {
            const [x1,y1,x2,y2] = d.box
            return {
              x: x1,
              y: y1,
              width: x2 - x1,
              height: y2 - y1
            }
          }),
          vw: -1, // this is fine because we are not scaling
          vh: -1,
          fullScreen: b64,
        })
      })

      const { clips } = (await res2.json()) as { clips: string[] }
      console.log('response two', clips.length)
      const res3 = await fetch('http://localhost:8000/ocr/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clips
        })
      })
      const { results } = (await res3.json()) as { results: Array<{text: string, score: number }> }

      const enhancedDetections = detections.map((d, i) => {
            const {text, score} = results[i] ?? {}
            return {
              ...d,
              text: text
                ? `${text}:${score.toFixed(2)}`
                : 'error'
            }
          })
      console.log('response 3',
        enhancedDetections
      )


      sendMessage(ExtensionMessage.predict, {
        content: {
          detections: enhancedDetections,
          width,
          height,
        },
      })
      // window.close()
    } catch (e) {
      console.error('predict failed wtf', e)
    } finally {
    }
  })

  exportBtn!.addEventListener('click', async () => {
    disableAllButtons()
    // clear the overlay, reset global state to initial
    await getMessagePromise('clean')
    // this is seemingly necessary to actually allow the screenshot to go off after the
    // clean up of decorations
    await snooze()
    const payload = await getExportPayload()

    console.log('PAYLOAD 2 EXPORT', payload)

    try {
      fetch('http://localhost:4000/api/annotation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }).then((response) => {
        if (response.ok) {
          console.log('successful export', response)
          sendMessage(ExtensionMessage.exportSuccess)
          chrome.storage.local.clear()
          window.close()
          return
        }
        throw `Bad status: ${response.status}`
      })
    } catch (e) {
      sendMessage(ExtensionMessage.exportFailed)
      console.error('could not export', e)
    }
  })

  startBtn!.addEventListener('click', async () => {
    disableAllButtons()
    sendMessage(ExtensionMessage.startMain, {
      cb: () => {
        window.close()
      },
    })
  })

  endBtn!.addEventListener('click', async () => {
    disableAllButtons()
    sendMessage(ExtensionMessage.turnOffExtension, {
      cb: () => window.close(),
    })
  })

  // unused right now
  async function d2PredictHandler() {
    disableAllButtons()
    try {
      const screenshotUrl = await chrome.tabs.captureVisibleTab()
      const b64 = screenshotUrl.split(';base64,')[1]
      const res = await fetch('http://localhost:8000/predict_base64', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: b64 }),
      })
      const {
        boxes,
        class_names,
        width: imgW,
        height: imgH,
      } = (await res.json()) as PredictResponse
      sendMessage(ExtensionMessage.predict, {
        content: {
          boxes,
          class_names,
          imgW,
          imgH,
        },
      })
      window.close()
    } catch (e) {
      console.error('predict failed wtf', e)
    } finally {
    }
  }
})

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

async function getExportPayload(): Promise<AnnotationRequest> {
  const obj = await chrome.storage.local.get(['annotations', 'meta'])

  const annotations = JSON.parse(obj['annotations']) as AnnotationPayload['annotations']
  const meta = obj['meta'] as {
    url: string
    date: string
    window: {
      scrollY: number
      width: number
      height: number
    }
    tag?: string
  }

  const screenshotUrl = await chrome.tabs.captureVisibleTab()
  const base64Image = screenshotUrl.split(';base64,')[1]

  return {
    annotations: annotations.map(a => ({
      id: a.id,
      label: a.label,
      rect: a.rect,
      textContent: a.textContent
    })),
    screenshot: base64Image,
    ...meta,
  }
}
