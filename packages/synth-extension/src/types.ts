export type Msg =
  | { type: "START_EXPORT" }
  | { type: "CAPTURE_VISIBLE_TAB" }
  | { type: "EXPORT_RESULT"; ok: boolean; error?: string };