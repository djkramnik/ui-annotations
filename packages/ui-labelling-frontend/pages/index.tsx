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
    'hi'
  )
}
