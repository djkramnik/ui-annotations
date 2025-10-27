import * as React from 'react'
import { useEffect, useState } from 'react'
import { Card, ConfigProvider, Space, Switch, theme as antdTheme } from 'antd'
import { randInt, randomPick } from '../../util/random'

type AntSize = 'small' | 'default'

type Item = {
  width: number            // 220–600
  scale: number            // 0.9–1.3 visual scale factor
  size: AntSize            // small | default
  shadowIndex: number      // 1–6
  checked: boolean
  disabled: boolean
  wrapped: boolean         // true => default (thumb fully inside); false => overhang style
  colorHex: string         // per-toggle primary color
}

const PALETTE = [
  '#1677ff', '#13c2c2', '#52c41a', '#faad14', '#f5222d', '#722ed1',
  '#2f54eb', '#eb2f96', '#a0d911', '#fa541c',
]

export function AntToggle() {
  const { token } = antdTheme.useToken()
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    const count = randInt(2, 6)
    const generated: Item[] = Array.from({ length: count }, () => ({
      width: randInt(220, 600),
      scale: randInt(90, 130) / 100,
      size: randomPick<AntSize>(['small', 'default']),
      shadowIndex: randInt(1, 6),
      checked: Math.random() < 0.6,
      disabled: Math.random() < 0.15,
      wrapped: Math.random() > 0.3,                 // ~70% wrapped (default Ant look)
      colorHex: randomPick(PALETTE),
    }))
    setItems(generated)
  }, [])

  return (
    <>
      {/* one-time CSS for the overhang (unwrapped) variant */}
      <style>{`
        .ant-toggle-overhang.ant-switch {
          height: 22px; /* track height */
        }
        .ant-toggle-overhang.ant-switch .ant-switch-handle {
          width: 24px;
          height: 24px;               /* slightly larger than track => overhang */
          top: 50%;
          transform: translateY(-50%);
          box-shadow: none;
        }
        .ant-toggle-overhang.ant-switch .ant-switch-inner {
          height: 100%;
        }
        /* adjust travel distance for the larger thumb */
        .ant-toggle-overhang.ant-switch-checked .ant-switch-handle {
          inset-inline-start: calc(100% - 22px);
        }
        .ant-toggle-overhang.ant-switch:not(.ant-switch-checked) .ant-switch-handle {
          inset-inline-start: 2px;
        }
        /* a touch more rounding on the track */
        .ant-toggle-overhang.ant-switch {
          border-radius: 999px;
        }
      `}</style>

      <Space direction="vertical" align="start" size="middle">
        {items.map((it, idx) => {
          const shadow = `0 ${it.shadowIndex}px ${it.shadowIndex * 4}px rgba(0,0,0,0.12)`
          const rootClassName = it.wrapped ? undefined : 'ant-toggle-overhang'

          return (
            <Card
              key={idx}
              style={{
                width: it.width,
                borderRadius: 8,
                boxShadow: shadow,
                padding: 12,
                transition: 'box-shadow 0.25s ease',
                transform: `scale(${it.scale})`,
                transformOrigin: 'left top',
              }}
              bodyStyle={{ padding: 0 }}
            >
              <ConfigProvider theme={{ token: { colorPrimary: it.colorHex } }}>
                <Switch
                  size={it.size}
                  checked={it.checked}
                  disabled={it.disabled}
                  onChange={() =>
                    setItems(prev =>
                      prev.map((x, j) => (j === idx ? { ...x, checked: !x.checked } : x)),
                    )
                  }
                  rootClassName={rootClassName}
                />
              </ConfigProvider>
            </Card>
          )
        })}
      </Space>
    </>
  )
}
