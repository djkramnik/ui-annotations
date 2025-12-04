import { Box, SxProps, Theme, Typography } from "@mui/material";
import { Rect } from "ui-labelling-shared";
import { MultiLine } from "./multi-line";

type TocEntryProps = {
  textContent: string;
  containerSx?: SxProps<Theme>
  textSx?: SxProps<Theme>
  pageNumSx?: SxProps<Theme>
  className?: string; // optional extra class for the container
};

function splitTocText(text: string): { main: string; page?: string } {
  // Match: "<anything> (inner)" where the LAST "(...)" is taken
  const match = text.match(/^(.*?)(\s*\(([^)]*)\))\s*$/);

  if (!match) {
    return { main: text.trim() };
  }

  const main = match[1].trim();
  const pageInner = match[3].trim(); // content inside parentheses

  return {
    main,
    page: pageInner || undefined,
  };
}

export function TocEntry({
  textContent,
  className,
  textSx,
  pageNumSx,
  containerSx
}: TocEntryProps) {
  const { main, page } = splitTocText(textContent);

  return (
    <Box
      id="label_toc_entry"
      className={`toc_entry ${className ?? ""}`.trim()}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: 'space-between',
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
      }}
      sx={containerSx}
    >
      <Typography
        className="toc_entry_main"
        component="p"
        sx={textSx}
      >
        <MultiLine>{main}</MultiLine>
      </Typography>
      {page && (
        <Typography
          className="toc_entry_page"
          component="p"
          sx={pageNumSx}
        >{page}</Typography>
      )}
    </Box>
  );
}