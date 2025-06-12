export function toBase64(arrayBuffer: ArrayBuffer) {
  return btoa([].reduce.call(new Uint8Array(arrayBuffer), function(p,c){return p+String.fromCharCode(c)},''))
}