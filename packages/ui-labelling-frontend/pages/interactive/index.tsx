import { useRouter } from 'next/router'
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import {
  batchUpdateInteractive,
  deleteInteractive,
  getInteractiveAnalytics,
  getInteractivePage,
  InteractiveRecord,
  updateInteractive,
} from '../../api'
import { toImgSrc } from '../../utils/img'
import { InteractiveLabel } from 'ui-labelling-shared'
import { Flex } from '../../components/flex'
import Link from 'next/link'

const interactiveLabels = Object.values(InteractiveLabel)

const LabelForm = ({
  id,
  label,
  onUpdate,
  onDelete,
}: {
  id: number
  label: string
  onUpdate: (id: number, label: string) => void
  onDelete: (id: number) => void
}) => {
  const selectRef = useRef<HTMLSelectElement | null>(null)

  useEffect(() => {
    if (!selectRef.current) {
      return
    }
    selectRef.current.value = label
  }, [label])

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!selectRef.current) {
        return
      }
      const label = selectRef.current.value
      if (label === '') {
        return
      }
      await updateInteractive(id, label)
      onUpdate(id, label)
    },
    [onUpdate],
  )

  return (
    <form onSubmit={handleSubmit}>
      <select id={`label_${id}`} ref={selectRef} required>
        <option value="" selected>
          Select label
        </option>
        {interactiveLabels.map((label) => {
          return (
            <option key={label} value={label}>
              {label}
            </option>
          )
        })}
      </select>
      <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
        <button type="submit">Update</button>
        <button type="button" onClick={() => onDelete(id)}>
          Delete
        </button>
      </div>
    </form>
  )
}

const NavButton = ({
  text,
  page,
  unlabelled,
  targetLabel,
  synth,
}: {
  text: string
  page: number
  unlabelled?: boolean
  targetLabel?: string
  synth?: boolean
}) => {
  const { push } = useRouter()
  const navigate = useCallback(() => {
    push(
      `/interactive?page=${page}${unlabelled === false ? '&unlabelled=false' : ''}${targetLabel ? `&label=${targetLabel}` : ''}${synth ? `&synth=true` : ''}`,
    )
  }, [page, unlabelled, push])
  return (
    <button type="button" onClick={navigate}>
      {text}
    </button>
  )
}

export default function InteractiveLabellingPage() {
  const { query } = useRouter()
  const page = Number(String(query.page ?? '0'))
  const unlabelled = String(query.unlabelled) !== 'false'
  const targetLabel = String(query.label ?? '')
  const synthOnly = query.synth === 'true'
  const [analytics, setAnalytics] =
    useState<{ label: string; count: number }[]>()
  const [records, setRecords] = useState<InteractiveRecord[] | null>(null)

  const handleLabelUpdate = useCallback(
    (id: number, label: string) => {
      setRecords((records) => {
        const index = records.findIndex((r) => r.id === id)
        if (index === -1) {
          console.warn('cannot find record we just updated: ', id, label)
          return records
        }
        records[index].label = label
        return records.slice(0)
      })
    },
    [setRecords],
  )

  const updateAll = useCallback(async () => {
    const updates: Array<{ id: number; label: string | null }> = records.map(
      (r) => {
        return {
          id: r.id,
          label:
            (document.querySelector(`#label_${r.id}`) as HTMLSelectElement)
              .value || null,
        }
      },
    )
    await batchUpdateInteractive(updates)
    setRecords((records) => {
      return records.map((r) => {
        return {
          ...r,
          label:
            (document.querySelector(`#label_${r.id}`) as HTMLSelectElement)
              .value || null,
        }
      })
    })
  }, [records, setRecords])

  const handleDelete = useCallback(
    async (id: number) => {
      await deleteInteractive(id)
      setRecords((records) => {
        return records.filter((r) => r.id !== id)
      })
    },
    [setRecords],
  )

  useEffect(() => {
    let cancelled = false

    async function fetchPage() {
      const resp = await getInteractivePage({
        page,
        unlabelled,
        label: targetLabel || undefined,
        synth: synthOnly
      })
      if (cancelled) {
        return
      }
      setRecords(resp.items)
    }
    async function fetchAnalytics() {
      const resp = await getInteractiveAnalytics()
      if (cancelled) {
        return
      }
      setAnalytics(resp.labelCounts)
    }

    Promise.all([fetchPage(), fetchAnalytics()])
    return () => {
      cancelled = true
    }
  }, [page, setRecords, setAnalytics, unlabelled, targetLabel])

  if (Number.isNaN(page) || page < 0) {
    return 'bad page param'
  }
  if (records === null) {
    return null
  }
  const cellStyle = { padding: '10px', border: '1px solid black' }
  const borderStyle = { border: '1px solid black ' }
  return (
    <>
      {analytics ? (
        <div
          style={{
            position: 'fixed',
            right: '0',
            top: '12px',
            width: 'fit-content',
            backgroundColor: 'white',
          }}
        >
          <table>
            <thead>
              <th style={borderStyle}>Label</th>
              <th style={borderStyle}>Count</th>
            </thead>
            <tbody>
              {analytics
                .sort((a, b) => b.count - a.count)
                .map((a) => {
                  return (
                    <tr key={a.label ?? 'null'}>
                      <td style={borderStyle}>{a.label ?? 'null'}</td>
                      <td style={borderStyle}>{a.count}</td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      ) : null}
      <Flex dir="column" gap="8px">
        <Flex gap="4px">
          {page > 0 ? (
            <NavButton
              text="Prev"
              page={page - 1}
              unlabelled={unlabelled}
              targetLabel={targetLabel}
              synth={synthOnly}
            />
          ) : null}
          <NavButton
            text="Next"
            page={page + 1}
            unlabelled={unlabelled}
            targetLabel={targetLabel}
            synth={synthOnly}
          />
        </Flex>
        <table style={{ tableLayout: 'fixed', border: '1px solid black' }}>
          <thead>
            <tr>
              <th style={{ width: '300px', ...cellStyle }}>Image</th>
              <th
                style={{
                  ...cellStyle,
                  width: '100px',
                }}
              >
                Label
              </th>
              <th
                style={{
                  ...cellStyle,
                  width: '100px',
                }}
              >
                Update
              </th>
              <th style={{ width: '100px' }}>View</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => {
              return (
                <tr key={r.id}>
                  <td style={cellStyle}>
                    <img
                      style={{ width: '100%' }}
                      src={toImgSrc(r.screenshot)}
                    />
                  </td>
                  <td style={cellStyle}>{r.label ?? 'UNLABELLED'}</td>
                  <td style={cellStyle}>
                    <LabelForm
                      id={r.id}
                      label={r.label}
                      onUpdate={handleLabelUpdate}
                      onDelete={handleDelete}
                    />
                  </td>
                  <td>

                    <Link
                      href={`/interactive/${r.annotationId}?boxId=${r.true_id}`}
                      target="_blank"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <Flex gap="4px">
          {page > 0 ? (
            <NavButton
              text="Prev"
              page={page - 1}
              unlabelled={unlabelled}
              targetLabel={targetLabel}
              synth={synthOnly}
            />
          ) : null}
          <NavButton
            text="Next"
            page={page + 1}
            unlabelled={unlabelled}
            targetLabel={targetLabel}
            synth={synthOnly}
          />
          <button onClick={updateAll}>Update all</button>
        </Flex>
      </Flex>
    </>
  )
}
