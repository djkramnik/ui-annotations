import * as React from 'react'
import { useEffect, useState } from 'react'
import { Card, Input, Space, theme as antdTheme } from 'antd'
import { randInt, randomPick } from '../../util/random'
import { getRandomSentences } from '../../util/faker/text'

const { TextArea } = Input

type Item = {
  width: number           // 240–520
  rows: number            // 2–6
  fontPx: number          // 13–17
  shadowIndex: number     // 1–6 (controls shadow intensity)
  defaultValue?: string
}

export function AntTextarea() {
  const { token } = antdTheme.useToken()
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    const count = randInt(2, 5)
    const generated: Item[] = Array.from({ length: count }, () => ({
      width: randInt(240, 700),
      rows: randInt(2, 6),
      fontPx: randInt(13, 17),
      shadowIndex: randInt(1, 6),
      defaultValue: Math.random() < 0.6 ? getRandomSentences(randInt(1, 3)) : '',
    }))
    setItems(generated)
  }, [])

  return (
    <Space direction="vertical" align="start" size="middle">
      {items.map((it, idx) => (
        <Card
          key={idx}
          style={{
            width: it.width,
            borderRadius: 8,
            boxShadow: `0 ${it.shadowIndex}px ${it.shadowIndex * 4}px rgba(0,0,0,0.12)`,
            padding: 12,
            transition: 'box-shadow 0.25s ease',
          }}
          bodyStyle={{ padding: 0 }}
        >
          <TextArea
            rows={it.rows}
            defaultValue={it.defaultValue}
            placeholder="Enter text..."
            style={{
              fontSize: it.fontPx,
              lineHeight: 1.5,
              border: `1px solid ${token.colorBorder}`,
              borderRadius: 6,
            }}
          />
        </Card>
      ))}
    </Space>
  )
}
