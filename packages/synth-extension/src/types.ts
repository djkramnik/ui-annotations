import { ScreenshotRequest } from "ui-labelling-shared";

export type Msg =
  | { type: 'PREVIEW' }
  | { type: "START_EXPORT" }
  | { type: "CAPTURE_VISIBLE_TAB" }
  | { type: "POST_SCREENSHOT"; payload: ScreenshotRequest }   // <- add this
  | { type: "EXPORT_RESULT"; ok: boolean; error?: string };
