// components/PlausibleRandomAntAccordion.tsx
import * as React from 'react'
import { useEffect, useState } from 'react'
import { Collapse, Typography, ConfigProvider, theme } from 'antd'
import type { CollapseProps } from 'antd'
import {
  DownOutlined,
  CaretDownOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons'

import { cardTitles, cardDescriptions } from '../../util/faker/selectablecard'
import { randInt, randomPick } from '../../util/random'
import { LabelWrap } from '../label-wrap'
import { InteractiveLabel } from 'ui-labelling-shared'

type Item = {
  title: string
  description: string
  width: number      // 280–560 px
  titlePx: number    // 16–20 px
  descPx: number     // 12–14 px
  shadowKey: 'primary' | 'secondary'
}

const plausibleIcons = [DownOutlined, CaretDownOutlined, ArrowDownOutlined]

export function AntAccordion() {
  const { token } = theme.useToken()
  const [items, setItems] = useState<Item[]>([])
  const [activeKey, setActiveKey] = useState<string | string[] | undefined>()
  const [Icon, setIcon] = useState<React.ElementType>(() => DownOutlined)

  useEffect(() => {
    // pick a single plausible icon for the whole accordion
    setIcon(() => randomPick(plausibleIcons))

    const count = randInt(2, 5)
    const generated: Item[] = Array.from({ length: count }, () => ({
      title: randomPick(cardTitles),
      description: randomPick(cardDescriptions),
      width: randInt(280, 560),
      titlePx: randInt(16, 20),
      descPx: randInt(12, 14),
      shadowKey: randomPick(['primary', 'secondary']),
    }))
    setItems(generated)
    // open a random panel by default
    setActiveKey(String(randInt(0, count - 1)))
  }, [])

  const expandIcon: CollapseProps['expandIcon'] = ({ isActive }) => {
    const Ico = Icon as any
    return (
      <Ico
        style={{
          fontSize: 18,
          transition: 'transform 0.2s ease',
          transform: isActive ? 'rotate(180deg)' : 'none',
        }}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((it, idx) => {
        const key = String(idx)
        const boxShadow =
          it.shadowKey === 'primary' ? token.boxShadow : token.boxShadowSecondary

        return (
          <ConfigProvider
            // keep styles plausible and native by leaning on Ant tokens
            key={key}
          >
            <LabelWrap label={InteractiveLabel.accordion}>
              <Collapse
                className="themed-collapse"
                activeKey={activeKey}
                onChange={(k) => setActiveKey(k as any)}
                expandIcon={expandIcon}
                style={{
                  width: it.width,
                  boxShadow,
                  borderRadius: token.borderRadiusLG,
                  transition: 'box-shadow 0.25s ease',
                }}
                items={[
                  {
                    key,
                    label: (
                      <Typography.Text
                        style={{
                          fontSize: it.titlePx,
                          fontWeight: 600,
                          margin: 0,
                          lineHeight: 1.3,
                        }}
                      >
                        {it.title}
                      </Typography.Text>
                    ),
                    children: (
                      <Typography.Paragraph
                        type="secondary"
                        style={{
                          fontSize: it.descPx,
                          lineHeight: 1.5,
                          margin: 0,
                        }}
                      >
                        {it.description}
                      </Typography.Paragraph>
                    ),
                  },
                ]}
              />
            </LabelWrap>
          </ConfigProvider>
        )
      })}
    </div>
  )
}
