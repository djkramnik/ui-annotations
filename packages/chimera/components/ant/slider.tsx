import React, { useEffect, useMemo, useState } from 'react'
import { Slider, theme as antdTheme } from 'antd'
import { randInt } from '../../util/random'
import { getClamp } from '../../util/clamp'

export function AntSlider() {
  const { token } = antdTheme.useToken()
  const [value, setValue] = useState(40)
  const [vertical, setVertical] = useState<boolean>(false)
  const [railLen, setRailLen] = useState<number>(180)

  useEffect(() => {
    setValue(getClamp(0, 100)(randInt(-10, 110)))
    setVertical(Math.random() > 0.7)
    setRailLen(Math.floor(Math.random() * 100 + 80)) // 180–320px (vertical length))
  }, [
    setVertical,
    setRailLen,
    setValue
  ])

  const styles = {
    rail:  { backgroundColor: token.colorFillSecondary },
    track: { backgroundColor: token.colorPrimary },
    handle:{ backgroundColor: token.colorPrimary, borderColor: token.colorPrimary, boxShadow: 'none' },
  } as const

  return (
    <div
      style={{
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        boxShadow: token.boxShadowTertiary,
        padding: 12,
        display: 'inline-block',
        width: 'fit-content',
      }}
    >
      <Slider
        vertical={vertical}
        value={value}
        onChange={setValue}
        min={0}
        max={100}
        styles={styles}
        // ⬇️ crucial: set height for vertical, width for horizontal
        style={vertical ? { height: railLen } : { width: railLen }}
      />
    </div>
  )
}
