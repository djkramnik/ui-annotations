// DOM traversal that takes into account open shadow root

export function getChildrenWithShadow(el: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = Array.from(el.children) as HTMLElement[]

  const sr = (el as HTMLElement).shadowRoot
  if (!sr) {
    return out
  }

  for (const child of Array.from(sr.children)) {
    if (child instanceof HTMLSlotElement) {
      const assigned = child.assignedElements({ flatten: true }) as HTMLElement[];
      if (assigned.length) {
        out.push(...assigned)
      }
      else {
        out.push(child)
      } // empty slot still a node
    } else {
      out.push(child as HTMLElement);
    }
  }

  return Array.from(new Set(out))
}

export function getParentWithShadow(el: HTMLElement): HTMLElement | null {
  const slot = (el as HTMLElement).assignedSlot
  if (slot) {
    return slot
  } // if slotted, parent is the slot its assigned to... apparently

  const parent = el.parentElement
  if (parent) {
    return parent
  }

  const root = el.getRootNode()
  if (root instanceof ShadowRoot) {
    return root.host as HTMLElement
  }
  return null
}

export function getSiblingsWithShadow(el: HTMLElement): HTMLElement[] {
  const parent = getParentWithShadow(el)
  if (!parent) {
    return []
  }
  return getChildrenWithShadow(parent)
    .filter(child => child !== el)
}
