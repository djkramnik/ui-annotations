export function gmtTimestamp() {
  const d = new Date()

  const pad = (n: number) => String(n).padStart(2, "0")

  const year   = d.getUTCFullYear()
  const month  = pad(d.getUTCMonth() + 1)
  const day    = pad(d.getUTCDate())
  const hour   = pad(d.getUTCHours())
  const minute = pad(d.getUTCMinutes())
  const second = pad(d.getUTCSeconds())

  return `${year}-${month}-${day}:${hour}:${minute}:${second}`
}

export function sagemakerGmtTimestamp() {
  const d = new Date()

  const pad = (n: number) => String(n).padStart(2, "0")

  const year   = d.getUTCFullYear()
  const month  = pad(d.getUTCMonth() + 1)
  const day    = pad(d.getUTCDate())
  const hour   = pad(d.getUTCHours())
  const minute = pad(d.getUTCMinutes())
  const second = pad(d.getUTCSeconds())

  return `${year}-${month}-${day}_${hour}_${minute}_${second}`
}