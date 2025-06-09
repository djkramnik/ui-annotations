import { useEffect, useState } from 'react'
import Link from 'next/link'

type Row = { id: string; url: string }

export default function DirectoryPage() {
  const [rows, setRows] = useState<Row[]>([])

  useEffect(() => {
    fetch('/api/annotation')
      .then(r => r.json())
      .then(({ data }) => {
        console.log('data', data)
        setRows(data)
      })
      .catch(console.error)
  }, [])

  return (
    <main id="directory-view" className="directory">
    <h2>Directory</h2>
    <ol id="directory-list">
      {rows.map(({ id, url }) => (
        <li key={id}>
          <Link href={`/view/${id}`}>{url}</Link>
        </li>
      ))}
    </ol>
  </main>
  )
}
