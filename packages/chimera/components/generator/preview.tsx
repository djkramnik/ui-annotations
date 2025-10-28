import { ThemeProvider, CssBaseline } from "@mui/material"
import { PreviewSchema } from "../../util/localstorage"
import { GridRenderer } from "../../components/generator/dynamicGrid"
import { DynamicMuiComponent } from "../../components/mui/service-manual-dynamic"
import { randomMuiTheme } from "../../components/mui/theme"
import { useMemo } from "react"

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
