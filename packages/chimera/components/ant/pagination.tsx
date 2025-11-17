import * as React from 'react'
import { useEffect, useState } from 'react'
import { Card, Pagination, Space, theme as antdTheme } from 'antd'
import { randInt, randomPick } from '../../util/random'

type Item = {
  width: number               // 260–700
  total: number               // total items (pages derived by pageSize)
  defaultPage: number         // starting page
  pageSize: number            // 5–20
  size: 'small' | 'default'
  simple: boolean
  showSizeChanger: boolean
  shadowIndex: number         // 1–6
}

export function AntPagination() {
  const { token } = antdTheme.useToken()
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    const count = randInt(2, 6)

    const generated: Item[] = Array.from({ length: count }, () => {
      const pageSize = randInt(5, 20)
      const total = randInt(20, 200)
      return {
        width: randInt(260, 700),
        total,
        defaultPage: randInt(1, Math.ceil(total / pageSize)),
        pageSize,
        size: randomPick(['small', 'default']),
        simple: Math.random() < 0.3,         // 30% chance simple mode
        showSizeChanger: Math.random() < 0.25, // 25% chance
        shadowIndex: randInt(1, 6),
      }
    })

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
            padding: 16,
            boxShadow: `0 ${it.shadowIndex}px ${it.shadowIndex * 4}px rgba(0,0,0,0.12)`,
            transition: 'box-shadow 0.25s ease',
            display: 'flex',
            justifyContent: 'center',
          }}
          bodyStyle={{ padding: 0 }}
        >
          <Pagination
            total={it.total}
            defaultCurrent={it.defaultPage}
            pageSize={it.pageSize}
            size={it.size}
            simple={it.simple}
            showSizeChanger={it.showSizeChanger}
          />
        </Card>
      ))}
    </Space>
  )
}
