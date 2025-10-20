/**
 * Lighten or darken a hex color by a given percent.
 * @param hex - e.g. "#3B82F6"
 * @param percent - positive to lighten, negative to darken (e.g. 10 or -10)
 * @returns adjusted hex string
 */
export function adjustColor(hex: string, percent: number): string {
  // Normalize and strip '#'
  let color = hex.replace(/^#/, '');
  if (color.length === 3) {
    color = color.split('').map(c => c + c).join('');
  }

  const num = parseInt(color, 16);
  const amt = Math.round(2.55 * percent);

  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));

  return (
    '#' +
    (0x1000000 + (R << 16) + (G << 8) + B)
      .toString(16)
      .slice(1)
      .toUpperCase()
  );
}
