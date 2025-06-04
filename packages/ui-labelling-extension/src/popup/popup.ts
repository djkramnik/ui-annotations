
document.addEventListener('DOMContentLoaded', () => {
  // today copy to clipboard, tomorrow the world
  const exportBtn = document.getElementById('export-btn')
  const clearBtn = document.getElementById('clear-btn')
  const startBtn = document.getElementById('start-btn')

  if (!exportBtn || !clearBtn || !startBtn) {
    console.error('cannot get dom objects')
    return
  }

  exportBtn.addEventListener('click', async () => {
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
          sendMessage('exportSuccess')
          return
        }
        throw `Bad status: ${response.status}`
      })
    } catch(e) {
      sendMessage('exportFailed')
      console.error('could not export', e)
    } finally {
      exportBtn.removeAttribute('disabled')
    }
  })

  clearBtn.addEventListener('click', async () => {
    clearBtn.setAttribute('disabled', 'disabled')
    await chrome.storage.local.clear()
    clearBtn.removeAttribute('disabled')
  })

  startBtn.addEventListener('click', async () => {
    startBtn.setAttribute('disabled', 'disabled')
    sendMessage('startMain', () => {
      startBtn.removeAttribute('disabled')
    })
  })
})

function sendMessage(type: string, cb?: () => void) {
  return chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    if (typeof tabs[0]?.id !== 'number') {
      return
    }
    await chrome.tabs.sendMessage(tabs[0].id, { type })
    cb?.()
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
