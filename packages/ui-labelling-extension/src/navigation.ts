// DOM traversal that takes into account open shadow root

export function getChildrenWithShadow(el: HTMLElement): HTMLElement[] {
  const sr = (el as HTMLElement).shadowRoot;
  if (sr) {
    const out: HTMLElement[] = [];
    for (const child of Array.from(sr.children)) {
      if (child instanceof HTMLSlotElement) {
        const assigned = child.assignedElements({ flatten: true }) as HTMLElement[];
        if (assigned.length) {
          out.push(...assigned)
        }
        else {
          out.push(...Array.from(child.children) as HTMLElement[])
        }
      } else {
        out.push(child as HTMLElement);
      }
    }
    // De-dupe just in case a node appears twice via flattening (rare)
    return Array.from(new Set(out));
  }
  // No shadow root → plain light DOM children
  return Array.from(el.children) as HTMLElement[];
}


export function getParentWithShadow(el: HTMLElement): HTMLElement | null {
  const slot = (el as HTMLElement).assignedSlot
  if (slot) {
    console.log('WE ARE A SLOT IN SEARCH OF A PARENT')
    const slotRoot = slot.getRootNode();
    return slotRoot instanceof ShadowRoot ? (slotRoot.host as HTMLElement) : null;
  }

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

export function normalizeForNav(el: HTMLElement): HTMLElement {
  if (!(el instanceof HTMLSlotElement)) {
    return el
  }
  const assigned = el.assignedElements({ flatten: true })
    .find((n): n is HTMLElement => n instanceof HTMLElement);
  if (assigned) {
    return assigned
  }

  // Otherwise fallback content inside the slot (if any)
  const fb = Array.from(el.children)
    .find((n): n is HTMLElement => n instanceof HTMLElement);
  if (fb) {
    return fb
  }

  // Truly empty slot → step up to the host (so you’re not stuck)
  const host = el.getRootNode() instanceof ShadowRoot
    ? (el.getRootNode() as ShadowRoot).host as HTMLElement
    : null;

  return host ?? el
}

export function deepElementFromPoint(x: number, y: number): Element | null {
  let el: Element | null = document.elementFromPoint(x, y);
  let prev: Element | null = null;

  while (el && el !== prev) {
    prev = el;

    // Dive into OPEN shadow roots
    const sr = (el as HTMLElement).shadowRoot;
    if (sr) {
      const inner = sr.elementFromPoint(x, y);
      if (inner) { el = inner; continue; }
    }

    // If it's a <slot>, pick the assigned element that contains the point
    if (el instanceof HTMLSlotElement) {
      const assigned = el.assignedElements({ flatten: true });
      const hit = assigned.find(a => {
        const r = (a as HTMLElement).getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      });
      if (hit) { el = hit; continue; }
      // fallback content inside slot
      const fb = Array.from(el.children).find(a => {
        const r = (a as HTMLElement).getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      });
      if (fb) { el = fb; continue; }
    }

    break;
  }

  return el;
}