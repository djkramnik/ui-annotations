// components/AntSelectableCard.tsx
import * as React from 'react'
import { useEffect, useRef, useState } from 'react'
import { Card, Checkbox, Typography } from 'antd'
import type { CheckboxChangeEvent } from 'antd/es/checkbox'

// faker + utils (same as your MUI file)
import { cardDescriptions, cardTitles } from '../../util/faker/selectablecard'
import { randInt, randomPick } from '../../util/random'

// Ant icons (pick any you like)
import {
  AndroidOutlined,
  ApiOutlined,
  BugOutlined,
  CameraOutlined,
  CloudUploadOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  FireOutlined,
  HeartTwoTone,
  RocketOutlined,
  SettingOutlined,
  SmileTwoTone,
  UserOutlined,
} from '@ant-design/icons'

type IconType = React.ComponentType<{ style?: React.CSSProperties }>

function RandomAntIcon({
  icons,
  sizeRange = [24, 48],
}: {
  icons: IconType[]
  sizeRange?: [number, number]
}) {
  const size = randInt(sizeRange[0], sizeRange[1])
  const Icon = randomPick(icons)
  return <Icon style={{ fontSize: size }} />
}

export const AntSelectableCard: React.FC = () => {
  const iconRef = useRef<HTMLDivElement | null>(null)

  const [checked, setChecked] = useState(false)
  const [title, setTitle] = useState(cardTitles[0])
  const [description, setDescription] = useState(cardDescriptions[0])
  const [reversed, setReversed] = useState(false) // checkbox left/right
  const [gap, setGap] = useState<number>(12)
  const [withIcon, setWithIcon] = useState(false)
  const [iconSize, setIconSize] = useState(24)
  const [extraPad, setExtraPad] = useState(0)
  const [checkboxSize, setCheckboxSize] = useState<number>(1)

  useEffect(() => {
    setChecked(Math.random() > 0.5)
    setTitle(randomPick(cardTitles))
    setDescription(randomPick(cardDescriptions))
    setReversed(Math.random() > 0.5)
    setWithIcon(Math.random() > 0.5)
    setIconSize(randInt(24, 48))
    setCheckboxSize(Math.random() * 0.8 + 1)
    setGap(randInt(12, 32))
  }, [])

  useEffect(() => {
    if (!withIcon) return
    setExtraPad(iconSize) // reserve horizontal padding for the side icon
  }, [withIcon, iconSize])

  const onCheckboxChange = (e: CheckboxChangeEvent) => {
    setChecked(e.target.checked)
  }

  // Ant Design v5 primary color variable (fallback provided)
  const primary = 'var(--ant-color-primary, #1677ff)'

  return (
    <Card
      bordered
      style={{
        position: 'relative',
        borderWidth: 2,
        borderStyle: 'solid',
        borderColor: checked ? primary : 'transparent',
        // add padding to avoid overlap with the side icon
        ...(withIcon
          ? { [reversed ? 'paddingRight' : 'paddingLeft']: `${extraPad}px` }
          : null),
      }}
      bodyStyle={{ padding: 0 }} // we’ll control spacing inside
    >
      {/* Optional vertically-centered side icon */}
      {withIcon && (
        <div
          ref={iconRef}
          style={{
            position: 'absolute',
            top: '50%',
            [reversed ? 'right' : 'left']: 8,
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 0,
          }}
        >
          <RandomAntIcon
            sizeRange={[iconSize, iconSize]}
            icons={[
              AndroidOutlined,
              ApiOutlined,
              BugOutlined,
              CameraOutlined,
              CloudUploadOutlined,
              DashboardOutlined,
              DatabaseOutlined,
              FireOutlined,
              HeartTwoTone,
              RocketOutlined,
              SettingOutlined,
              SmileTwoTone,
              UserOutlined,
            ]}
          />
        </div>
      )}

      {/* Header row: title + checkbox (reversible) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: `${gap}px`,
          padding: '12px 16px',
          flexDirection: reversed ? 'row-reverse' : 'row',
        }}
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
        }}>
          <Typography.Title
            level={5}
            style={{ margin: 0, flex: 1, minWidth: 0, userSelect: 'none' }}
          >
            {title}
          </Typography.Title>
          {description && (
            <div>
              <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
                {description}
              </Typography.Paragraph>
            </div>
          )}
        </div>
        <Checkbox
          style={{
            transform: `scale(${checkboxSize})`,
            transformOrigin: 'center', // keeps it centered
          }}
          className="cb-contrast"
          checked={checked}
          onChange={onCheckboxChange}
        />
      </div>
    </Card>
  )
}
