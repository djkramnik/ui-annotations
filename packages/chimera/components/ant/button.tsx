// components/random/AntButtonSet.tsx
import * as React from 'react'
import { useEffect, useState } from 'react'
import { Button, Card, Space, theme as antdTheme } from 'antd'
import {
  SaveOutlined,
  SendOutlined,
  DeleteOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  ShoppingCartOutlined,
  EditOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  InfoCircleOutlined,
  SettingOutlined,
  DownloadOutlined,
  UploadOutlined,
} from '@ant-design/icons'

import { randInt, randomPick } from '../../util/random'
import { getRandomButtonLabel } from '../../util/faker/button'

type ButtonType = 'primary' | 'default' | 'dashed' | 'link' | 'text'

type Item = {
  label: string
  type: ButtonType
  size: 'small' | 'middle' | 'large'
  danger: boolean
  block: boolean
  loading: boolean
  disabled: boolean
  shape: 'default' | 'round'
  iconPosition: 'prefix' | 'suffix' | null
  icon: React.ReactNode | null
  width: number
}

const ICON_POOL = [
  SaveOutlined,
  SendOutlined,
  DeleteOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  ShoppingCartOutlined,
  EditOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  InfoCircleOutlined,
  SettingOutlined,
  DownloadOutlined,
  UploadOutlined,
]

export function AntButtonSet() {
  const { token } = antdTheme.useToken()
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    const count = randInt(4, 10)

    const generated: Item[] = Array.from({ length: count }, () => {
      const type = randomPick<ButtonType>([
        'primary',
        'default',
        'dashed',
        'link',
        'text',
      ])

      const label = getRandomButtonLabel()

      // Icon: sometimes prefix OR suffix, never both
      let iconPosition: Item['iconPosition'] = null
      let icon: React.ReactNode | null = null

      if (Math.random() < 0.45) {
        const IconComp = randomPick(ICON_POOL)
        icon = <IconComp />
        iconPosition = Math.random() < 0.5 ? 'prefix' : 'suffix'
      }

      return {
        label,
        type,
        size: randomPick(['small', 'middle', 'large']),
        danger: Math.random() < 0.25,
        block: Math.random() < 0.25,
        loading: Math.random() < 0.15,
        disabled: Math.random() < 0.1,
        shape: Math.random() < 0.3 ? 'round' : 'default',
        iconPosition,
        icon,
        width: randInt(160, 260),
      }
    })

    setItems(generated)
  }, [])

  return (
    <Space direction="vertical" size={16} align="start" style={{ width: '100%' }}>
      {items.map((it, idx) => (
        <Card
          key={idx}
          size="small"
          style={{
            width: it.block ? '100%' : it.width,
            borderRadius: 8,
            boxShadow: token.boxShadowSecondary,
          }}
          bodyStyle={{ padding: 12, display: 'flex', justifyContent: 'center' }}
        >
          <Button
            type={it.type}
            size={it.size}
            danger={it.danger}
            loading={it.loading}
            disabled={it.disabled}
            block={it.block}
            shape={it.shape}
            icon={it.iconPosition === 'prefix' ? it.icon : undefined}
          >
            {it.iconPosition === 'suffix' && it.icon}
            {it.label}
          </Button>
        </Card>
      ))}
    </Space>
  )
}
