import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import { getInteractivePage, InteractiveRecord } from "../../api"

export default function InteractiveLabellingPage() {
  const { query } = useRouter()
  const page = Number(String(query.page ?? '0'))
  const [records, setRecords] = useState<InteractiveRecord[] | null>(null)

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

  return <>{records.length}<br/>{records[0].true_id}</>
}