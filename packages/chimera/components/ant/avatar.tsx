import * as React from 'react'
import { useEffect, useState } from 'react'
import { Avatar, Card, Space, theme as antdTheme, Typography } from 'antd'
import { randInt, randomPick } from '../../util/random'

type Item = {
  size: number            // 32–96
  shape: 'circle' | 'square'
  shadowIndex: number     // 1–6
  bgColor: string
  content: string
}

const COLORS = [
  '#1890ff', '#722ed1', '#13c2c2',
  '#fa541c', '#fa8c16', '#2f54eb',
  '#eb2f96', '#52c41a'
]

export function AntAvatar() {
  const { token } = antdTheme.useToken()
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    const count = randInt(3, 8)

    const makeLetters = () => {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      if (Math.random() < 0.8) {
        // 80% → one letter
        return letters[randInt(0, 25)]
      } else {
        // 20% → two letters
        return (
          letters[randInt(0, 25)] +
          letters[randInt(0, 25)]
        )
      }
    }

    const generated: Item[] = Array.from({ length: count }, () => ({
      size: randInt(32, 96),
      shape: randomPick(['circle', 'square']),
      shadowIndex: randInt(1, 6),
      bgColor: randomPick(COLORS),
      content: makeLetters(),
    }))

    setItems(generated)
  }, [])

  return (
    <Space direction="vertical" align="start" size="middle">
      {items.map((it, idx) => (
        <Card
          key={idx}
          style={{
            width: it.size * 4,
            borderRadius: 8,
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            boxShadow: `0 ${it.shadowIndex}px ${
              it.shadowIndex * 4
            }px rgba(0,0,0,0.12)`,
            transition: 'box-shadow 0.25s ease',
          }}
          bodyStyle={{ padding: 0 }}
        >
          <Avatar
            shape={it.shape}
            size={it.size}
            style={{
              backgroundColor: it.bgColor,
              fontSize: it.size * 0.45,
            }}
          >
            {it.content}
          </Avatar>

          <Typography.Text type="secondary">
            size: {it.size}px<br />
            shape: {it.shape}
          </Typography.Text>
        </Card>
      ))}
    </Space>
  )
}
