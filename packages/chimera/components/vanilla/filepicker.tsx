import { VanillaTheme } from './type'

export const FilePicker = ({
  theme,
  header,
}: {
  theme: VanillaTheme
  header?: string
}) => {
  return (
    <div className="dropzone" style={{
      backgroundColor: theme.palette.backgroundColor
    }}>
      {/* icon */}

    </div>
  )
}