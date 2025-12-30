import * as React from 'react'
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardHeader,
  Checkbox,
  Typography,
} from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import { cardDescriptions, cardTitles } from '../../util/faker/selectablecard'
import { randInt, randomPick } from '../../util/random'
import { Abc, AccountCircle, AcUnit, Adb, AdbOutlined, AdbSharp, AdbTwoTone, AddAPhoto, AddCardTwoTone, AddCircleTwoTone, AddLocationTwoTone, AirlineSeatFlat, AirlineSeatFlatAngled, AnchorTwoTone, ApiTwoTone, Grass, Handyman, Headset, HeartBroken, LockClock } from '@mui/icons-material'
import { RandomMuiIcon } from './icon'

export const MuiSelectableCard = () => {
  const iconRef = useRef<HTMLElement | null>(null)
  const [checked, setChecked] = useState<boolean>(false)
  const [title, setTitle] = useState<string>(cardTitles[0])
  const [description, setDescription] = useState<string>(cardDescriptions[0])
  const [reversed, setReversed] = useState<boolean>(false)
  const [minW, setMinW] = useState<number>(200)
  const [withIcon, setWithIcon] = useState<boolean>(false)
  const [iconSize, setIconSize] = useState<number>(24)
  const [extraPad, setExtraPad] = useState<number>(0)

  useEffect(() => {
    setChecked(Math.random() > 0.5)
    setTitle(randomPick(cardTitles))
    setDescription(randomPick(cardDescriptions))
    setReversed(Math.random() > 0.5)
    setMinW(randInt(200, 600))
    setWithIcon(Math.random() > 0.5)
    setIconSize(randInt(24, 48))
  }, [setChecked, setTitle, setDescription, setReversed, setMinW])

  useEffect(() => {
    if (!withIcon) {
      return
    }
    setExtraPad(iconSize)
  }, [iconSize, withIcon, setExtraPad])

  return (
    <Card
      data-label="label_selectablecard"
      variant={checked ? 'outlined' : 'elevation'}
      sx={{
        borderColor: checked ? 'primary.main' : 'transparent',
        borderWidth: 2,
        borderStyle: 'solid',
        minWidth: `${minW}px`,
        position: 'relative',
        ...(withIcon
          ? ({
            [reversed ? 'paddingRight' : 'paddingLeft']: `${extraPad}px`
          })
          : undefined
        )
      }}
    >
      {withIcon ? (
        <Box
          ref={iconRef}
          sx={{
            position: 'absolute',
            top: '50%',
            left: reversed ? 'auto' : 8,
            right: reversed ? 8 : 'auto',
            transform: 'translateY(-50%)', // 👈 vertical center
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <RandomMuiIcon
            sizeRange={[iconSize, iconSize]}
            icons={[
              Adb,
              AdbOutlined,
              AdbTwoTone,
              AdbSharp,
              Abc,
              AcUnit,
              AddAPhoto,
              HeartBroken,
              Headset,
              Handyman,
              Grass,
              AccountCircle,
              AddCardTwoTone,
              AddCircleTwoTone,
              AddLocationTwoTone,
              AirlineSeatFlat,
              AirlineSeatFlatAngled,
              AnchorTwoTone,
              ApiTwoTone,
            ]}
          />
        </Box>
      ) : null}

      <CardActionArea>
        {/* Header row: title left, checkbox right */}
        <CardHeader
          title={title}
          action={
            <Checkbox checked={checked} onClick={(e) => e.stopPropagation()} />
          }
          sx={{
            pb: description ? 0 : 1,
            ...(reversed
              ? {
                  flexDirection: 'row-reverse',
                  '.MuiCardHeader-action': { mr: 0 },
                }
              : {}),
          }}
        />
        {description && (
          <CardContent sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          </CardContent>
        )}
      </CardActionArea>
    </Card>
  )
}
