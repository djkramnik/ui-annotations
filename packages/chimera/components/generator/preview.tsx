import { ThemeProvider, CssBaseline } from "@mui/material"
import { GridRenderer } from "../../components/generator/dynamicGrid"
import { DynamicMuiComponent } from "../../components/mui/service-manual-dynamic"
import { randomMuiTheme } from "../../components/mui/theme"
import { useMemo } from "react"
import { PreviewSchema } from "../../util/generator"

export const GeneratedPreview = ({
  preview,
  iter
}: {
  preview: PreviewSchema
  iter: number
}) => {
  const theme = useMemo(() => {
    return randomMuiTheme()
  }, [iter])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div>
        <hr />
        <GridRenderer key={iter} data={preview}
          showDebugBorders
          ComponentRenderer={DynamicMuiComponent}
        />
      </div>
    </ThemeProvider>
  )
}
