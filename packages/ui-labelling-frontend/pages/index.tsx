import { useEffect, useState } from 'react'
import Link from 'next/link'
import { SimpleDate } from '../components/date'
import { getAnnotations, getPublishedAnnotations } from '../api'
import { Flex } from '../components/flex'

type Row = {
  id: string
  url: string
  date: string
  scrollY: number
}

const Annotation = ({
  index,
  ...rest
}: {
  index: number
} & Row) => {
  const { id, url, date, scrollY } = rest
  return (
    <li key={id} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      {index + 1}.
      <Link href={`/view/${id}`}>{url}</Link>
      <strong>Date: <SimpleDate date={date} /></strong>
      <p>Scroll: {scrollY}</p>
    </li>
  )
}

export default function DirectoryPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [pubRows, setPubRows] = useState<Row[]>([])

  useEffect(() => {
    let cancelled = false
    async function fetchAll() {
      return Promise.all([
        getAnnotations(),
        getPublishedAnnotations(),
      ])
      .then(([drafts, published]) => {
        if (cancelled === true) {
          return
        }
        setRows(drafts.data)
        setPubRows(published.data)
      })
      .catch(console.error)
    }
    fetchAll()

    return () => {
      cancelled = true
    }

  }, [])

  return (
    <main id="directory-view" className="directory">
    <h2>Draft Annotations</h2>
    <Flex gap="12px">
      <Flex dir="column" gap="12px">
        <h4>Drafts</h4>
        <ol style={{ minWidth: '300px', paddingRight: '12px', borderRight: '1px solid black' }}>
          {
            rows
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map((row, index) => (
                <Annotation key={index} index={index} {...row} />
              ))
          }
        </ol>
      </Flex>
      <Flex dir="column" gap="12px" style={{ backgroundColor: '#eee' }}>
        <h4>Published</h4>
        <ol style={{ minWidth: '300px' }}>
          {
            pubRows
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map((row, index) => (
                <Annotation key={index} index={index} {...row} />
              ))
          }
        </ol>
      </Flex>
    </Flex>
  </main>
  )
}