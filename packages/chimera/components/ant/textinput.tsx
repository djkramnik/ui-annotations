// components/random/AntTextInput.tsx
import * as React from 'react'
import { useEffect, useState } from 'react'
import { Card, Space, Input, Typography, theme as antdTheme } from 'antd'
import {
  MailOutlined,
  LockOutlined,
  UserOutlined,
  SearchOutlined,
  HomeOutlined,
  PhoneOutlined,
  NumberOutlined,
  GlobalOutlined,
  BankOutlined,
} from '@ant-design/icons'

import { randInt, randomPick } from '../../util/random'
import { getRandomSentences } from '../../util/faker/text'
import { getRandomFieldError } from '../../util/faker/error'
import {
  getRandomTextInputConfig,
  TextInputFlavor,
} from '../../util/faker/textinput'
import { InteractiveLabel } from 'ui-labelling-shared'
import { LabelWrap } from '../label-wrap'

const { Text } = Typography
const { Password } = Input

type Item = {
  width: number
  size: 'small' | 'middle' | 'large'
  type: 'text' | 'email' | 'password' | 'number'
  label: string
  placeholder?: string
  defaultValue?: string
  error: boolean
  helperText?: string
  required: boolean
  disabled: boolean
  allowClear: boolean
  prefixIcon: React.ReactNode | null
  suffixIcon: React.ReactNode | null
}

const ICON_POOL = [
  MailOutlined,
  LockOutlined,
  UserOutlined,
  SearchOutlined,
  HomeOutlined,
  PhoneOutlined,
  NumberOutlined,
  GlobalOutlined,
  BankOutlined,
]

// Prefer “logical” icons per flavor, fall back to random
function pickIconForFlavor(flavor: TextInputFlavor) {
  switch (flavor) {
    case 'email':
      return MailOutlined
    case 'password':
      return LockOutlined
    case 'name':
    case 'username':
      return UserOutlined
    case 'company':
      return BankOutlined
    case 'city':
    case 'addressLine':
      return HomeOutlined
    case 'phone':
      return PhoneOutlined
    case 'amount':
    case 'quantity':
      return NumberOutlined
    case 'url':
      return GlobalOutlined
    case 'search':
      return SearchOutlined
    default:
      return randomPick(ICON_POOL)
  }
}

// Map flavor → HTML input type + error kind
function getTypeForFlavor(
  flavor: TextInputFlavor,
): {
  type: Item['type']
  errorKind: 'generic' | 'email' | 'password' | 'number'
} {
  switch (flavor) {
    case 'email':
      return { type: 'email', errorKind: 'email' }
    case 'password':
      return { type: 'password', errorKind: 'password' }
    case 'amount':
    case 'quantity':
    case 'postalCode':
      return { type: 'number', errorKind: 'number' }
    default:
      return { type: 'text', errorKind: 'generic' }
  }
}

export function AntTextInput() {
  const { token } = antdTheme.useToken()
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    const count = randInt(3, 7)

    const generated: Item[] = Array.from({ length: count }, () => {
      const { flavor, label, placeholder } = getRandomTextInputConfig()
      const { type, errorKind } = getTypeForFlavor(flavor)
      const { error, helperText } = getRandomFieldError(errorKind)

      // Default value logic
      const hasDefaultValue = Math.random() < 0.5
      let defaultValue = ''
      if (hasDefaultValue) {
        if (type === 'password') {
          defaultValue = ''
        } else if (type === 'email') {
          defaultValue = 'user@example.com'
        } else if (type === 'number') {
          defaultValue = String(randInt(1, 9999))
        } else {
          defaultValue = getRandomSentences(1)
        }
      }

      // Adornment logic: never both prefix & suffix
      //  - about 40% chance of *some* icon
      //  - split between prefix / suffix
      const adornRoll = Math.random()
      let prefixIcon: React.ReactNode | null = null
      let suffixIcon: React.ReactNode | null = null

      if (adornRoll < 0.4) {
        const IconComponent = pickIconForFlavor(flavor)
        const iconNode = <IconComponent style={{ opacity: 0.7 }} />

        // ~50/50 between prefix and suffix when we do show an icon
        if (Math.random() < 0.5) {
          prefixIcon = iconNode
        } else {
          suffixIcon = iconNode
        }
      }

      return {
        width: randInt(220, 420),
        size: randomPick(['small', 'middle', 'large']),
        type,
        label,
        placeholder,
        defaultValue,
        error,
        helperText,
        required: Math.random() < 0.5,
        disabled: Math.random() < 0.1,
        allowClear: Math.random() < 0.5,
        prefixIcon,
        suffixIcon,
      }
    })

    setItems(generated)
  }, [])

  return (
    <Space direction="vertical" size={16} align="start">
      {items.map((it, idx) => {
        const labelText = (
          <Text style={{ fontSize: 12, color: token.colorTextSecondary }}>
            {it.label}
            {it.required ? ' *' : ''}
          </Text>
        )

        const commonProps = {
          size: it.size,
          disabled: it.disabled,
          allowClear: it.allowClear,
          placeholder: it.placeholder,
          defaultValue: it.defaultValue,
          prefix: it.prefixIcon ?? undefined,
          suffix: it.suffixIcon ?? undefined,
          status: it.error ? ('error' as const) : undefined,
        }

        const inputNode =
          <div data-label="label_textinput">
            {
             it.type === 'password' ? (
                <Password {...commonProps} />
              ) : (
                <Input {...commonProps} type={it.type} />
              )
            }
          </div>


        return (
          <Card
            key={idx}
            size="small"
            style={{
              width: it.width,
              borderRadius: 8,
              boxShadow: token.boxShadowSecondary,
            }}
            bodyStyle={{ padding: 12 }}
          >
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              {labelText}
              {inputNode}
              {it.error && it.helperText && (
                <Text
                  type="danger"
                  style={{ fontSize: 11, lineHeight: 1.4 }}
                >
                  {it.helperText}
                </Text>
              )}
            </Space>
          </Card>
        )
      })}
    </Space>
  )
}
