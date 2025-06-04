;(async function main() {

  showDirectory()

  const state = GlobalState(handleViewChange)

  document.querySelector('#back-btn').addEventListener('click', event => {
    state.activeView = null
  })

  async function fetchAnnotationList() {
    const response = await fetch('/api/annotation')
    const json = await response.json()
    return json.data
  }

  async function fetchAnnotation(id) {
    const response = await fetch('/api/annotation/' + id)
    const json = await response.json()
    return json.data
  }

  function populateDirectory(rows, parent) {
    const existingList = parent.querySelector('#directory-list')
    if (existingList) {
      console.warn('remove existing list')
      existingList.remove()
    }

    const list = document.createElement('ol')
    list.setAttribute('id', 'directory-list')
    rows.forEach(row => {
      const item = document.createElement('li')
      const anchor = document.createElement('a')
      anchor.setAttribute('href', '#')
      anchor.addEventListener('click', (e) => {
        e.preventDefault()
        state.activeView = row.id
      })
      anchor.innerText = `${row.url}`
      item.appendChild(anchor)
      list.appendChild(item)
    })
    parent.appendChild(list)
  }

  function populateAnnotation(annotation, parent) {
    const {
      url,
      payload: {
        annotations,
        window,
      },
      screenshot
    } = annotation
    const existingUi = parent.querySelector('.annotation')
    if (existingUi) {
      existingUi.remove()
    }
    const ui = document.createElement('div')
    ui.classList.add('annotation')
    ui.innerHTML = `
      <h3>${url}</h3>
      <div id="annotation-img" style="background-size:contain;position:relative;width:${(window.width/2)}px;height:${(window.height/2)}px;">
        <div style="position:absolute;top:0;left:0;width:100%;height:100%;"></div>
      </div>
    `
    parent.appendChild(ui)
    ui.querySelector('#annotation-img').style.backgroundImage = `url('data:image/png;base64,${toBase64(screenshot.data)}')`

    function toBase64(arrayBuffer) {
      return btoa([].reduce.call(new Uint8Array(arrayBuffer),function(p,c){return p+String.fromCharCode(c)},''))
    }
  }

  function GlobalState(cb) {
    let activeView = null
    const obj = {
      activeView,
    }
    Object.defineProperty(obj, 'activeView', {
      set: (value) => {
        cb('activeView', value)
        activeView = value
      },
      get: () => activeView
    })
    return obj
  }

  function handleViewChange(action, value) {
    switch(action) {
      case 'activeView':
        if (value === null) {
          window.history.pushState({}, null, '/')
          showDirectory()
          break
        }
        window.history.pushState({ view: value }, null, '/view/' + value)
        showAnnotation(value)
        break
      default:
        console.warn('unknown action', action)
        break
    }
  }

  async function showDirectory() {
    document.querySelector('#directory-view').style.display = 'initial'
    document.querySelector('#annotation-view').style.display = 'none'
    const rows = await fetchAnnotationList()
    populateDirectory(rows, document.querySelector('.directory'))
  }

  async function showAnnotation(view) {
    document.querySelector('#directory-view').style.display = 'none'
    document.querySelector('#annotation-view').style.display = 'initial'
    document.querySelector('#annotation-heading').innerText = view
    const annotation = await fetchAnnotation(view)
    console.log('annotation', annotation)
    populateAnnotation(annotation, document.querySelector('#annotation-view'))
  }
})()