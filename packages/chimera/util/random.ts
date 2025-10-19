export function randInt(_min: number, _max: number) {
  let min = Math.ceil(_min);
  let max = Math.floor(_max);
  if (max < min) [min, max] = [max, min];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomPick<T>(arr: Array<T>): T {
  return arr[randInt(0, arr.length - 1)]
}