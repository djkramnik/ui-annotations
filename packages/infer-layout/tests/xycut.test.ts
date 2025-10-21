import { bestSplit, Component, Interval, splitOnGutter } from '../src/util'
import { xyCut } from '../src/index'
describe('xycut smoke test', () => {
  it('performs xy cut as expected on our toy example', () => {
    const props = makeTestData()
    const root = xyCut(props)
    expect(root).toMatchInlineSnapshot(`
     {
       "children": [
         {
           "children": [
             {
               "components": [
                 "component1",
               ],
               "region": [
                 0,
                 0,
                 17.5,
                 12,
               ],
             },
             {
               "children": [
                 {
                   "components": [
                     "component2",
                   ],
                   "region": [
                     0,
                     12,
                     8,
                     25,
                   ],
                 },
                 {
                   "components": [
                     "component3",
                   ],
                   "region": [
                     8,
                     12,
                     17.5,
                     25,
                   ],
                 },
               ],
               "components": [
                 "component2",
                 "component3",
               ],
               "region": [
                 0,
                 12,
                 17.5,
                 25,
               ],
             },
           ],
           "components": [
             "component1",
             "component2",
             "component3",
           ],
           "region": [
             0,
             0,
             17.5,
             25,
           ],
         },
         {
           "components": [
             "component4",
           ],
           "region": [
             17.5,
             0,
             25,
             25,
           ],
         },
       ],
       "components": [
         "component1",
         "component2",
         "component3",
         "component4",
       ],
       "region": [
         0,
         0,
         25,
         25,
       ],
     }
    `)
  })

  it('makes less aggressive splits when you bump up the minGap value', () => {
    const props = makeTestData()
    const root = xyCut({
      ...props,
      minGap: 2.4, // our toy example has only one gap > 2.4  So we should see just root and two children... right? right??
    })
    expect(root).toMatchInlineSnapshot(`
     {
       "children": [
         {
           "components": [
             "component1",
             "component2",
             "component3",
           ],
           "region": [
             0,
             0,
             17.5,
             25,
           ],
         },
         {
           "components": [
             "component4",
           ],
           "region": [
             17.5,
             0,
             25,
             25,
           ],
         },
       ],
       "components": [
         "component1",
         "component2",
         "component3",
         "component4",
       ],
       "region": [
         0,
         0,
         25,
         25,
       ],
     }
    `)
  })

  function makeTestData(): {
    components: Component[]
    page: { width: number; height: number }
    minGap: number
  } {
    const type = 'any'
    return {
      page: { width: 25, height: 25 },
      minGap: 1,
      components: [
        {
          id: 'component1',
          type,
          bbox: [1, 5, 12, 11],
        },
        {
          id: 'component2',
          type,
          bbox: [1, 13, 7, 18],
        },
        {
          id: 'component3',
          type,
          bbox: [9, 13, 16, 23],
        },
        {
          id: 'component4',
          type,
          bbox: [19, 13, 20, 23],
        },
      ],
    }
  }
})

describe('bestSplit', () => {
  it('returns based on size only if centrality score is 0', () => {
    expect(
      bestSplit({
        region: [0, 0, 1, 1],
        centralityWeight: 0, // disregard centrality
        ...makeTestData(
          [
            [2, 3],
            [21, 24],
          ], // largest vertical gutter has bigger gap but less centered
          [[11, 13]], // horizontal gutter has smaller gap but more centered
          { width: 25, height: 25 },
        ),
      }),
    ).toEqual({
      winner: 'vGutter', // winner is in vGutter,
      idx: 1, // the largest idx
    })

    // the reverse outcome but same idea
    expect(
      bestSplit({
        region: [0, 0, 1, 1],
        centralityWeight: 0, // disregard centrality
        ...makeTestData(
          [[11, 13]],
          [
            [21, 24],
            [2, 3],
          ],
          { width: 25, height: 25 },
        ),
      }),
    ).toEqual({
      winner: 'hGutter',
      idx: 0,
    })
  })

  it('returns based on both size and centrality if centrality score > 0', () => {
    expect(
      bestSplit({
        region: [0, 0, 1, 1],
        centralityWeight: 1, // centrality matters
        ...makeTestData(
          [
            [2, 3],
            [21, 24],
          ],
          [[11, 13]],
          { width: 25, height: 25 },
        ),
      }),
    ).toEqual({
      winner: 'hGutter',
      idx: 0,
    })

    // the reverse outcome but same idea
    expect(
      bestSplit({
        region: [0, 0, 1, 1],
        centralityWeight: 1,
        ...makeTestData(
          [[11, 13]],
          [
            [21, 24],
            [2, 3],
          ],
          { width: 25, height: 25 },
        ),
      }),
    ).toEqual({
      winner: 'vGutter',
      idx: 0,
    })
  })

  function makeTestData(
    vGutters: Interval[],
    hGutters: Interval[],
    page: { width: number; height: number },
  ): { cleanVGutters: Interval[]; cleanHGutters: Interval[] } {
    return {
      cleanVGutters: vGutters.map(([x0, x1]) => [
        x0 / page.width,
        x1 / page.width,
      ]),
      cleanHGutters: hGutters.map(([y0, y1]) => [
        y0 / page.height,
        y1 / page.height,
      ]),
    }
  }
})

describe('splitOnGutter', () => {
  it('splits a region along the x axis', () => {
    expect(
      splitOnGutter({
        axis: 'X',
        gutter: [16, 18],
        region: [0, 0, 25, 25],
        components: makeTestData(),
      }),
    ).toEqual([
      {
        region: [0, 0, 17, 25],
        components: ['component1', 'component2', 'component3'],
      },
      {
        region: [17, 0, 25, 25],
        components: ['component4'],
      },
    ])
  })
  it('splits a region along the y axis', () => {
    expect(
      splitOnGutter({
        axis: 'Y',
        gutter: [11, 13],
        region: [0, 0, 25, 25],
        components: makeTestData(),
      }),
    ).toEqual([
      {
        region: [0, 0, 25, 12],
        components: ['component1'],
      },
      {
        region: [0, 12, 25, 25],
        components: ['component2', 'component3', 'component4'],
      },
    ])
  })

  function makeTestData(): Component[] {
    const type = 'any'
    return [
      {
        id: 'component1',
        type,
        bbox: [1, 5, 12, 11],
      },
      {
        id: 'component2',
        type,
        bbox: [1, 13, 7, 18],
      },
      {
        id: 'component3',
        type,
        bbox: [9, 13, 16, 23],
      },
      {
        id: 'component4',
        type,
        bbox: [18, 13, 20, 23],
      },
    ]
  }
})
