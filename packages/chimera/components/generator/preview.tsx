import { ThemeProvider, CssBaseline } from "@mui/material"
import { GridRenderer } from "./dynamic-grid"
import { DynamicMuiComponent } from "../../components/mui/service-manual-dynamic"
import { randomMuiTheme } from "../../components/mui/theme"
import { useMemo } from "react"
import { PreviewSchema } from "../../util/generator/types"

export const GeneratedPreview = ({
  parentId,
  parentTag,
  preview,
  iter,
  debug
}: {
  parentId: number
  parentTag?: string
  preview: PreviewSchema
  iter: number
  debug?: boolean
}) => {
  const theme = useMemo(() => {
    return randomMuiTheme()
  }, [iter])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div>
        <hr />
        <GridRenderer
          parentId={parentId}
          parentTag={parentTag}
          key={iter} data={preview}
          showDebugBorders={debug}
          ComponentRenderer={DynamicMuiComponent}
          style={ !debug ?  {
            border: 'none'
          }: undefined}
        />
      </div>
    </ThemeProvider>
  )
}
