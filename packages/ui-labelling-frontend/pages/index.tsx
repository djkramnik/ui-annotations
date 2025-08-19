import { CSSProperties, useEffect, useState } from 'react'
import Link from 'next/link'
import { SimpleDate } from '../components/date'
import { Analytics, CountBreakdown, getAnalytics, getAnnotations, getPublishedAnnotations } from '../api'
import { Flex } from '../components/flex'
import { AnnotationLabel } from 'ui-labelling-shared'

type Row = {
  id: string
  url: string
  date: string
  scrollY: number
}

const labels = Object.values(AnnotationLabel)

const StatsBreakdown = (props: CountBreakdown & { title: string }) => {
  const borderedCentered = {
    border: '1px solid black',
    textAlign: 'center',
    padding: '8px'
  } as CSSProperties
  return (
    <table style={borderedCentered}>
      <thead>
        <tr>
          <th style={borderedCentered} colSpan={labels.length + 1}>
            {props.title}
          </th>
        </tr>
        <tr>
          {
            labels.map(l => <th style={borderedCentered} key={l}>{l}</th>)
          }
          <th style={borderedCentered}>url</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          {
            labels.map(l => <td style={borderedCentered} key={`value_` + l}>{props[l]}</td>)
          }
          <td style={borderedCentered}>
            {props['url']}
          </td>
        </tr>
      </tbody>
    </table>
  )
}

const Annotation = ({
  index,
  ...rest
}: {
  index: number
} & Row) => {
  const { id, url, date, scrollY } = rest
  return (
    <li>
      <Flex gap="12px" aic>
        <Link href={`/view/${id}`}>{url}</Link>
        <strong>Date: <SimpleDate date={date} /></strong>
        <p style={{ margin: 0 }}>Scroll: {scrollY}</p>
      </Flex>
    </li>
  )
}

export default function DirectoryPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [pubRows, setPubRows] = useState<Row[]>([])
  const [stats, setStats] = useState<Analytics | null>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchAll() {
      return Promise.all([
        getAnnotations(),
        getPublishedAnnotations(),
        getAnalytics(),
      ])
      .then(([drafts, published, stats]) => {
        if (cancelled === true) {
          return
        }
        setRows(drafts.data)
        setPubRows(published.data)
        setStats(stats.data)
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
    <h2>Annotations Directory</h2>
    <div>
      <h3 style={{ textDecoration: 'underline'}}>Stats</h3>
      <div style={{
        display: 'flex',
        gap: '8px'
      }}>
        {
          stats !== null
            ? (
              <>
                <StatsBreakdown {...stats.published} title="Published" />
                <StatsBreakdown {...stats.draft} title="Draft" />
              </>
            )
            : null
        }
      </div>
    </div>
    <Flex gap="12px">
      <Flex dir="column" gap="12px" style={{ maxWidth: '50vw'}}>
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