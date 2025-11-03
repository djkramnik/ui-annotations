export const getDataUrl = (source: ArrayBuffer) => {
  return `data:image/png;base64,${Buffer.from(source).toString('base64')}`
}

export function dataUrlToBlob(dataUrl: string) {
  const [head, b64] = dataUrl.split(",");
  const mime = head.match(/data:(.*?);base64/)?.[1] ?? "application/octet-stream";
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Blob([u8], { type: mime });
}