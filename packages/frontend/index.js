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

  }
})()