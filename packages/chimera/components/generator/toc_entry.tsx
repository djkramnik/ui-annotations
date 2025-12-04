import { Rect } from "ui-labelling-shared";

type TocEntryProps = {
  textContent: string;
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
}: TocEntryProps) {
  const { main, page } = splitTocText(textContent);

  return (
    <div
      id="label_toc_entry"
      className={`toc_entry ${className ?? ""}`.trim()}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: page ? "space-between" : "flex-start",
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
      }}
    >
      <span className="toc_entry_text">{main}</span>
      {page && (
        <span className="toc_entry_page">
          ({page})
        </span>
      )}
    </div>
  );
}