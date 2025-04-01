;(async function main() {

  const rows = await fetchAnnotationList()
  populateDirectory(rows, document.querySelector('.directory'))

  async function fetchAnnotationList() {
    const response = await fetch('http://localhost:4000/api/annotation')
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
        window.history.pushState({}, null, 'http://localhost:4000/view/' + row.id)
      })
      anchor.innerText = `${row.url}`
      item.appendChild(anchor)
      list.appendChild(item)
    })
    parent.appendChild(list)
  }
})()