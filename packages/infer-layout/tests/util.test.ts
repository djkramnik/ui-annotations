import { Bbox, clamp01, getVerticalGutters, getRegion, Interval, unionIntervals, getHorizontalGutters } from '../src/util'

describe('getBounds', () => {
  it('creates a region from a series of bounding boxes', () => {
    const boxes: Bbox[] = [
      [1,5,12,11],
      [1,13,7,18],
      [9,13,16,23]
    ]
    expect(getRegion(boxes)).toEqual([1,5,16,23])
  })
})

describe('clamp01', () => {
  it('has max 1', () => {
    expect(clamp01(1.0001)).toBe(1)
  })
  it('has min 0', () => {
    expect(clamp01(-0.9999)).toBe(0)
  })
})

describe('unionIntervals', () => {
  it('does not merge intervals if none overlapping', () => {
    const a: Interval = [1, 5]
    const b: Interval = [6, 10]
    expect(unionIntervals([a, b])).toEqual({
      merged: [
        [1, 5],
        [6, 10]
      ],
      total: 8
    })
  })
  it('merges overlapping intervals', () => {
    const a: Interval = [1, 5]
    const b: Interval = [5, 10]
    const c: Interval = [9, 16]
    expect(unionIntervals([a, b, c])).toEqual({
      merged: [
        [1, 16]
      ],
      total: 15
    })
  })
})

describe('getVerticalGutters', () => {
  it('returns all empty vertical gutters in a region', () => {
    const region: Bbox = [0, 0, 25, 25]
    const boxes: Bbox[] = [
      [1,5,12,11],
      [1,13,7,18],
      [9,13,16,23]
    ]
    expect(getVerticalGutters(region, boxes)).toEqual([
      [0, 1],
      [16, 25]
    ])
  })
  it('returns empty array if no boxes provided', () => {
    const region: Bbox = [0, 0, 10, 25]
    const boxes: Bbox[] = []
    expect(getVerticalGutters(region, boxes)).toEqual([])
  })
})

describe('getHorizontalGutters', () => {
  it('returns all empty horizontal gutters in a region', () => {
    const region: Bbox = [0, 0, 25, 25]
    const boxes: Bbox[] = [
      [1,5,12,11],
      [1,13,7,18],
      [9,13,16,23]
    ]
    expect(getHorizontalGutters(region, boxes)).toEqual([
      [0, 5],
      [11, 13],
      [23, 25]
    ])
  })
  it('returns empty array if no boxes provided', () => {
    const region: Bbox = [0, 0, 10, 25]
    const boxes: Bbox[] = []
    expect(getHorizontalGutters(region, boxes)).toEqual([])
  })
})
