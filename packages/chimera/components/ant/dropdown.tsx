import * as React from 'react'
import { useEffect, useState } from 'react'
import { Card, Select, Space, theme as antdTheme } from 'antd'
import { DownOutlined } from '@ant-design/icons'
import { randInt, randomPick } from '../../util/random'
import {
  getRandomOptionLabels,
  getRandomDropdownPhrase,
} from '../../util/faker/select' // adjust path as needed

const { Option } = Select

type State = {
  width: number
  shadowIndex: number
  labels: string[]
  selectedIndex: number | null
  open: boolean
  size: 'small' | 'middle' | 'large'
  phrase: string
}

export function AntDropdown() {
  const { token } = antdTheme.useToken()
  const [state, setState] = useState<State | null>(null)

  useEffect(() => {
    const optionCount = randInt(3, 9)
    const labels = getRandomOptionLabels(optionCount, true)
    const phrase = getRandomDropdownPhrase()

    const hasSelection = Math.random() < 0.7
    const selectedIndex = hasSelection ? randInt(0, labels.length - 1) : null

    const initial: State = {
      width: randInt(240, 520),
      shadowIndex: randInt(1, 6),
      labels,
      selectedIndex,
      open: Math.random() < 0.4,
      size: randomPick(['small', 'middle', 'large']),
      phrase,
    }

    setState(initial)
  }, [])

  if (!state) return null

  const { width, shadowIndex, labels, selectedIndex, open, size, phrase } = state


  const borderColor =
    // @ts-ignore
    token.Select?.colorBorder ??
    token.colorBorder ??
    '#d9d9d9'

  const value = selectedIndex !== null ? labels[selectedIndex] : undefined

  const handleVisibleChange = (nextOpen: boolean) => {
    setState(prev => (prev ? { ...prev, open: nextOpen } : prev))
  }

  const handleChange = (nextValue: string) => {
    const idx = labels.indexOf(nextValue)
    setState(prev =>
      prev ? { ...prev, selectedIndex: idx >= 0 ? idx : null } : prev
    )
  }

  return (
    <Space direction="vertical" align="start" size="middle">
      <Card
        style={{
          width,
          borderRadius: 8,
          padding: 16,
          boxShadow: `0 ${shadowIndex}px ${shadowIndex * 4}px rgba(0,0,0,0.12)`,
          transition: 'box-shadow 0.25s ease',
        }}
        bodyStyle={{ padding: 0 }}
      >
        <Select
          style={{ width: '100%' }}
          size={size}
          placeholder={phrase}
          value={value}
          open={open}
          onDropdownVisibleChange={handleVisibleChange}
          onChange={handleChange}
          allowClear
          suffixIcon={<DownOutlined style={{ color: borderColor }} />}
        >
          {labels.map(label => (
            <Option key={label} value={label}>
              {label}
            </Option>
          ))}
        </Select>
      </Card>
    </Space>
  )
}
