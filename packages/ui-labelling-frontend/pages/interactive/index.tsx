import { useRouter } from "next/router"
import { FormEvent, useCallback, useEffect, useRef, useState } from "react"
import { getInteractivePage, InteractiveRecord, updateInteractive } from "../../api"
import { toImgSrc } from "../../utils/img"
import { InteractiveLabel } from "ui-labelling-shared"

const interactiveLabels = Object.values(InteractiveLabel)

const LabelForm = ({
    id,
    label,
    onUpdate
  }: {
    id: number,
    label: string
    onUpdate: (id: number, label: string) => void
  }) => {
  const selectRef = useRef<HTMLSelectElement | null>(null)

  useEffect(() => {
    if (!selectRef.current) {
      return
    }
    selectRef.current.value = label
  }, [label])

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault()
    if (!selectRef.current) {
      return
    }
    const label = selectRef.current.value
    if (label === '') {
      return
    }
    const resp = await updateInteractive(id, label)
    onUpdate(id, label)
  }, [onUpdate])

  return (
    <form onSubmit={handleSubmit}>
      <select ref={selectRef} required>
        <option value="" disabled selected>Select label</option>
          {
            interactiveLabels.map(label => {
              return (
                <option key={label} value={label}>
                  {label}
                </option>
              )
            })
          }
      </select>
      <button type="submit">
        Update
      </button>
    </form>
  )
}

export default function InteractiveLabellingPage() {
  const { query } = useRouter()
  const page = Number(String(query.page ?? '0'))
  const [records, setRecords] = useState<InteractiveRecord[] | null>(null)

  const handleLabelUpdate = useCallback((id: number, label: string) => {
    setRecords(records => {
      const index = records.findIndex(r => r.id === id)
      if (index === -1) {
        console.warn('cannot find record we just updated: ', id, label)
        return records
      }
      records[index].label = label
      return records.slice(0)
    })
  }, [setRecords])

  useEffect(() => {
    let cancelled = false

    async function fetchPage() {
      const resp = await getInteractivePage(page)
      if (cancelled) {
        return
      }
      setRecords(resp.items)
    }
    fetchPage()
    return () => { cancelled = true }
  }, [page, setRecords])

  if (Number.isNaN(page) || page < 0) {
    return 'bad page param'
  }
  if (records === null) {
    return null
  }
  const p10 = { padding: '10px' }
  return (
    <table style={{ tableLayout: 'fixed' }}>
      <thead>
        <tr>
          <th style={{ width: '300px'}}>Image</th>
          <th>Label</th>
          <th>Update</th>
        </tr>
      </thead>
      <tbody>
        {
          records.map(r => {
            return (
              <tr key={r.id}>
                <td style={p10}>
                  <img style={{ width: '100%' }} src={toImgSrc(r.screenshot)} />
                </td>
                <td style={p10}>
                  {r.label ?? 'UNLABELLED'}
                </td>
                <td style={p10}>
                  <LabelForm id={r.id} label={r.label}
                    onUpdate={handleLabelUpdate}
                  />
                </td>
              </tr>
            )
          })
        }
      </tbody>
    </table>
  )
}