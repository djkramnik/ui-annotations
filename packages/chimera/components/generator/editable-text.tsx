import React, { useEffect, useRef, useState } from 'react'

export function EditableText({
  id,
  text,
  onChange,
  onEditingChange,
  autoFocus = false,
  className,
  style,
}: {
  id: string
  text: string
  onChange: (next: string) => void
  onEditingChange?: (editing: boolean) => void
  autoFocus?: boolean
  className?: string
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (autoFocus) ref.current?.focus()
  }, [autoFocus])

  const enterEdit = () => {
    if (!editing) {
      setEditing(true)
      onEditingChange?.(true)
      // focus next tick so selection works
      setTimeout(() => ref.current?.focus(), 0)
    }
  }
  const exitEdit = () => {
    if (editing) {
      setEditing(false)
      onEditingChange?.(false)
      onChange((ref.current?.textContent ?? '').trimEnd())
    }
  }

  return (
    <div
      ref={ref}
      contentEditable={editing}
      suppressContentEditableWarning
      spellCheck
      className={className}
      style={{ outline: 'none', whiteSpace: 'pre-wrap', ...style }}
      onDoubleClick={(e) => {
        // Go into editing on double click; allow this event to NOT start a drag
        e.stopPropagation()
        enterEdit()
      }}
      // While editing, keep events from bubbling to the drag layer
      onPointerDown={(e) => { if (editing) e.stopPropagation() }}
      onKeyDown={(e) => {
        if (!editing) return
        e.stopPropagation()
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); exitEdit() }
        if (e.key === 'Escape') { e.preventDefault(); exitEdit() }
      }}
      onBlur={() => exitEdit()}
      onInput={(e) => {
        // live update if you prefer
        onChange((e.currentTarget as HTMLDivElement).innerText)
      }}
      onPaste={(e) => {
        if (!editing) return
        e.preventDefault()
        const t = e.clipboardData.getData('text/plain')
        document.execCommand('insertText', false, t)
      }}
    >
      {text}
    </div>
  )
}
