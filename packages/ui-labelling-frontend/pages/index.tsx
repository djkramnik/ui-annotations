import { useEffect, useState } from 'react'
import Link from 'next/link'

type Row = {
  id: string
  url: string
  date: string
  scrollY: number
}

export default function DirectoryPage() {
  const [rows, setRows] = useState<Row[]>([])

  useEffect(() => {
    fetch('/api/annotation?published=0')
      .then(r => r.json())
      .then(({ data }) => {
        console.log('data', data)
        setRows(data)
      })
      .catch(console.error)
  }, [])

  return (
    <main id="directory-view" className="directory">
    <h2>Draft Annotations</h2>
    <ol id="directory-list">
      {
        rows
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .map(({ id, url, date, scrollY }, index) => (
            <li key={id} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {index + 1}.
              <Link href={`/view/${id}`}>{url}</Link>
              <strong>Date: {new Date(date).toLocaleDateString()} {new Date(date).toLocaleTimeString()}</strong>
              <p>Scroll: {scrollY}</p>
            </li>
          ))
      }
    </ol>
  </main>
  )
}
