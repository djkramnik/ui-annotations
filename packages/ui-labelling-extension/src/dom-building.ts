import { annotationLabels } from 'ui-labelling-shared'
import {
  SALIENT_VISUAL_PROPS,
  ProjectionType,
  GlobalState,
  Annotation,
} from './types'
import { splitArray } from './util'

const trashCanUrl = chrome.runtime.getURL('/assets/trash-can.svg')

export function getButton(label: string, primary?: boolean) {
  const button = document.createElement('button')
  button.style.outline = 'none'
  button.style.border = 'none'
  button.style.minWidth = '140px'
  button.style.fontSize = '16px'
  button.style.padding = '6px'
  button.style.cursor = 'pointer'
  button.style.backgroundColor = primary ? 'green' : '#A0C6FC'
  button.style.color = 'white'
  button.textContent = label
  return button
}

export function getFormOverlay() {
  const formOverlay = document.createElement('div')
  formOverlay.style.position = 'absolute'
  formOverlay.style.display = 'none'
  formOverlay.style.alignItems = 'center'
  formOverlay.style.justifyContent = 'center'
  formOverlay.style.top = '0'
  formOverlay.style.left = '0'
  formOverlay.style.width = '100%'
  formOverlay.style.height = '100%'
  formOverlay.style.visibility = 'initial !important'
  formOverlay.style.zIndex = '10'
  return formOverlay
}

// this assumes that the parent must be relatively positioned!!
export function getRemoveIcon(
  handler?: (event: MouseEvent) => void,
): HTMLImageElement {
  const removeIcon = document.createElement('img')
  removeIcon.setAttribute('src', trashCanUrl)
  removeIcon.style.position = 'absolute'
  removeIcon.style.right = '0'
  removeIcon.style.height = '100%'
  removeIcon.style.maxHeight = '30px'
  removeIcon.style.minHeight = '15px'
  removeIcon.style.cursor = 'pointer'
  removeIcon.style.zIndex = '2'
  if (typeof handler === 'function') {
    removeIcon.addEventListener('mousedown', handler)
  }

  return removeIcon
}

export function buildForm({
  heading,
  handleSubmit,
  children,
}: {
  heading: string
  handleSubmit: (event: SubmitEvent) => void
  children: DocumentFragment
}): HTMLFormElement {
  const form = document.createElement('form')
  form.style.backgroundColor = 'rgba(255, 255, 255)'
  form.style.borderRadius = '8px'
  form.style.padding = '40px'
  form.style.border = '1px solid black'
  const formHeading = document.createElement('h3')
  formHeading.style.color = '#333'
  formHeading.innerText = heading
  form.appendChild(formHeading)
  form.appendChild(children)
  form.addEventListener('submit', handleSubmit)
  return form
}

export function buildAnnotationForm({
  handleCancel,
  handleProjection,
}: {
  handleCancel: () => void
  handleProjection: () => void
}): DocumentFragment {
  const fragment = document.createDocumentFragment()
  const container = document.createElement('div')
  container.className = 'annotation-form'

  const annotationSelect = buildLabelSelect()
  container.appendChild(annotationSelect)

  container.appendChild(
    buildCheckboxInput({
      name: 'usetextnode_cb',
      label: 'Shrink box to Text Node?',
    }),
  )

  const buttonContainer = document.createElement('div')
  buttonContainer.style.display = 'flex'
  buttonContainer.style.gap = '8px'
  container.appendChild(document.createElement('hr'))
  container.appendChild(buttonContainer)

  const submitButton = getButton('submit', true)
  submitButton.setAttribute('type', 'submit')
  buttonContainer.appendChild(submitButton)

  const cancelButton = getButton('cancel')
  cancelButton.setAttribute('type', 'button')
  cancelButton.addEventListener('click', handleCancel)
  buttonContainer.appendChild(cancelButton)

  const projectionButton = getButton('projection')
  projectionButton.setAttribute('type', 'button')
  projectionButton.addEventListener('click', handleProjection)
  buttonContainer.appendChild(projectionButton)

  fragment.append(container)
  return fragment
}

export function buildProjectionForm({
  handleCancel,
  handlePreview,
  handleToggleProjectText,
}: {
  handlePreview: () => void
  handleCancel: () => void
  handleToggleProjectText: (checked: boolean) => void
}): DocumentFragment {
  const frag: DocumentFragment = document.createDocumentFragment()
  const container: HTMLDivElement = document.createElement('div')
  container.className = 'projection-form'

  /* ---------- radio group ---------- */
  const fieldset: HTMLFieldSetElement = document.createElement('fieldset')
  const legend: HTMLLegendElement = document.createElement('legend')
  legend.textContent = 'Projection type'
  fieldset.appendChild(legend)

  const radioName = 'projectionType'
  const options: { label: string; value: ProjectionType }[] = [
    { label: 'direct siblings', value: 'siblings' },
    { label: 'cousins', value: 'cousins' },
    { label: 'visual', value: 'visual' },
  ]

  options.forEach(({ label, value }, i) => {
    const lbl: HTMLLabelElement = document.createElement('label')
    const inp: HTMLInputElement = document.createElement('input')
    inp.type = 'radio'
    inp.name = radioName
    inp.value = value
    if (i === 0) inp.checked = true // default
    lbl.style.display = 'block'
    lbl.append(inp, ` ${label}`)
    fieldset.appendChild(lbl)
  })

  container.appendChild(fieldset)

  /* ---------- dynamic section ---------- */
  const dynamicSection: HTMLDivElement = document.createElement('div')
  dynamicSection.className = 'projection-dynamic'
  container.appendChild(document.createElement('hr'))
  container.appendChild(dynamicSection)

  /* ---------- max input ---------- */
  const maxLabel: HTMLLabelElement = document.createElement('label')
  maxLabel.style.display = 'block'
  maxLabel.textContent = 'max '
  const maxInput: HTMLInputElement = document.createElement('input')
  maxInput.name = 'max'
  maxInput.value = '40'
  maxLabel.appendChild(maxInput)
  container.appendChild(maxLabel)

  /* ---------- buttons ---------- */
  const buttonContainer = document.createElement('div')
  buttonContainer.style.display = 'flex'
  buttonContainer.style.gap = '8px'

  const previewButton = getButton('preview', true)
  previewButton.setAttribute('type', 'button')
  previewButton.addEventListener('click', handlePreview)
  buttonContainer.appendChild(previewButton)

  const submitBtn: HTMLButtonElement = getButton('submit', true)
  submitBtn.setAttribute('id', 'submitBtn')
  submitBtn.type = 'submit'
  buttonContainer.appendChild(submitBtn)

  const cancelBtn: HTMLButtonElement = getButton('cancel')
  cancelBtn.setAttribute('id', 'cancelBtn')
  cancelBtn.type = 'button'
  cancelBtn.addEventListener('click', handleCancel)
  buttonContainer.appendChild(cancelBtn)

  const percentDisplay = document.createElement('p')
  percentDisplay.setAttribute('id', 'percentDisplay')
  percentDisplay.innerText = '0%'
  buttonContainer.appendChild(percentDisplay)

  container.appendChild(document.createElement('hr'))

  // misc section
  const misc = document.createElement('div')
  misc.style.display = 'flex'
  misc.style.gap = '8px'
  misc.appendChild(buildLabelSelect())
  const toggleTextNode = buildCheckboxInput({
    name: 'usetextnodeprojection_cb',
    label: 'Toggle Text',
    checked: false,
  })
  toggleTextNode.addEventListener('change', (e) =>
    handleToggleProjectText((e.target as HTMLInputElement)?.checked),
  )
  misc.appendChild(toggleTextNode)
  container.append(misc)

  container.appendChild(document.createElement('hr'))
  container.append(buttonContainer)

  /* ---------- dynamic render ---------- */
  const renderDynamic = (value: ProjectionType): void => {
    // clear the existing content
    dynamicSection.innerHTML = ''

    switch (value) {
      case 'cousins':
        const distLabel: HTMLLabelElement = document.createElement('label')
        distLabel.style.display = 'block'
        distLabel.textContent = 'distance '
        const distInput: HTMLInputElement = document.createElement('input')
        distInput.type = 'number'
        distInput.name = 'distance'
        distInput.value = '2'
        distLabel.appendChild(distInput)
        dynamicSection.appendChild(distLabel)
        break
      case 'visual':
        dynamicSection.appendChild(buildProjectionCheckboxGroup())
        break
      case 'siblings':
        break
    }
  }

  /* initial render */
  renderDynamic('siblings')

  /* listeners */
  fieldset
    .querySelectorAll<HTMLInputElement>(`input[name="${radioName}"]`)
    .forEach((radio) => {
      radio.addEventListener('change', () => {
        if (radio.checked) renderDynamic(radio.value as ProjectionType)
      })
    })

  frag.appendChild(container)
  return frag
}

function buildProjectionCheckboxGroup(
  visualProps?: string[],
): DocumentFragment {
  const props = visualProps ?? SALIENT_VISUAL_PROPS.slice(0)
  const frag = document.createDocumentFragment()
  const container = document.createElement('div')
  container.className = 'salient-controls'

  const containerInner = document.createElement('div')
  containerInner.style.display = 'flex'
  containerInner.style.gap = '8px'
  container.appendChild(containerInner)
  const splitProps = splitArray<string>({ list: props, len: 4 })
  // checkboxes + labels
  splitProps.forEach((group) => {
    const groupContainer = document.createElement('div')
    groupContainer.style.display = 'flex'
    groupContainer.style.flexDirection = 'column'
    group.forEach((prop) => {
      const label = document.createElement('label')
      const cb = Object.assign(document.createElement('input'), {
        type: 'checkbox',
        name: `visual_${prop}`,
        value: prop,
      })
      cb.className = 'visual-style'
      label.style.display = 'block'
      label.append(cb, ` ${prop}`)
      groupContainer.appendChild(label)
    })
    containerInner.appendChild(groupContainer)
  })

  // action buttons
  const checkAllBtn = getButton('Check All')
  checkAllBtn.type = 'button'

  const clearAllBtn = getButton('Clear All')
  clearAllBtn.type = 'button'

  // wire up
  checkAllBtn.addEventListener('click', () => {
    containerInner.querySelectorAll('input.visual-style').forEach((cb) => {
      ;(cb as HTMLInputElement).checked = true
    })
  })

  clearAllBtn.addEventListener('click', () => {
    containerInner.querySelectorAll('input.visual-style').forEach((cb) => {
      ;(cb as HTMLInputElement).checked = false
    })
  })

  const buttonContainer = document.createElement('div')
  buttonContainer.style.display = 'flex'
  buttonContainer.style.gap = '8px'
  buttonContainer.append(checkAllBtn, clearAllBtn)
  container.append(buttonContainer)

  container.append(document.createElement('hr'))

  const matchingRulesContainer = document.createElement('div')
  matchingRulesContainer.style.display = 'flex'
  matchingRulesContainer.style.gap = '8px'
  matchingRulesContainer.appendChild(
    buildCheckboxInput({
      name: 'match_tag',
      checked: true,
      label: 'Tag',
    }),
  )
  matchingRulesContainer.appendChild(
    buildCheckboxInput({
      name: 'match_class',
      label: 'Class',
    }),
  )
  matchingRulesContainer.appendChild(
    buildCheckboxInput({
      name: 'match_exact',
      label: 'Exact',
    }),
  )
  container.append(matchingRulesContainer)

  frag.appendChild(container)
  return frag
}

function buildCheckboxInput({
  name,
  checked,
  label,
}: {
  name: string
  checked?: boolean
  label: string
}) {
  const checkboxInputContainer = document.createElement('div')
  const labelEl = document.createElement('label')
  labelEl.textContent = label
  labelEl.setAttribute('htmlFor', name)
  const inputEl = document.createElement('input')
  inputEl.setAttribute('id', name)
  inputEl.setAttribute('type', 'checkbox')
  inputEl.setAttribute('name', name)
  if (checked) {
    inputEl.setAttribute('checked', 'checked')
  }
  checkboxInputContainer.append(labelEl, inputEl)
  return checkboxInputContainer
}

function buildLabelSelect(labels: Record<string, string> = annotationLabels) {
  const select = document.createElement('select')
  Object.keys(labels).forEach((s: string) => {
    const option = document.createElement('option')
    option.value = s
    option.innerText = s
    select.appendChild(option)
  })
  return select
}

export function buildColorLegend(
  dictionary: Record<string, string>,
  containerStyles?: Record<string, string>,
): HTMLDivElement {
  // Card container
  const card = document.createElement('div')

  Object.entries(containerStyles ?? []).forEach(([k, v]) => {
    card.style[k as any] = v
  })

  card.classList.add('legend')

  // Table with fixed layout and equal-width columns
  const table = document.createElement('table')
  table.style.width = '100%'
  table.style.tableLayout = 'fixed'

  // Define two equal-width columns
  const colGroup = document.createElement('colgroup')
  for (let i = 0; i < 2; i++) {
    const col = document.createElement('col')
    col.style.width = '50%'
    colGroup.appendChild(col)
  }
  table.appendChild(colGroup)

  // Sorted rows: color swatch first cell, label second cell
  Object.keys(dictionary)
    .sort()
    .forEach((key) => {
      const value = dictionary[key]

      const row = document.createElement('tr')

      const swatchCell = document.createElement('td')
      swatchCell.style.backgroundColor = value
      swatchCell.style.padding = '4px'
      row.appendChild(swatchCell)

      const labelCell = document.createElement('td')
      labelCell.textContent = key
      labelCell.style.padding = '4px'
      labelCell.style.textAlign = 'center'
      row.appendChild(labelCell)

      table.appendChild(row)
    })

  card.appendChild(table)

  return card
}

export function buildAnnotationList(id?: string): [HTMLDivElement, HTMLDivElement] {
  const card = document.createElement('div')
  card.setAttribute('id', id ?? 'annotation_list')
  Object.assign(card.style, {
    backgroundColor: 'white',
    maxHeight: '260px',
    overflowY: 'auto',
    padding: '8px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontFamily: 'sans-serif',
    fontSize: '12px',
    width: '600px',
    position: 'absolute',
    bottom: '12px',
    right: '12px'
  } as Partial<CSSStyleDeclaration>)
  const listContainer = document.createElement('div')

  card.appendChild(listContainer)
  return [card, listContainer]
}

export function populateAnnotationList({
  handler,
  annotations,
  container,
}: {
  handler: (ann: Annotation, action: 'select' | 'remove') => void
  annotations: Annotation[]
  container: HTMLElement
}) {

  annotations.forEach((ann) => {
    const item = document.createElement('div')
    Object.assign(item.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '4px',
    } as Partial<CSSStyleDeclaration>)

    const { top, left, width, height } = ann.rect
    const info = document.createElement('span')
    info.textContent = `${ann.label}, ${Math.round(top)}, ${Math.round(left)}, ${Math.round(width)}, ${Math.round(height)}`

    const btnGroup = document.createElement('div')
    btnGroup.style.display = 'flex'
    btnGroup.style.gap = '4px'

    const makeBtn = (text: string, action: 'select' | 'remove') => {
      const btn = document.createElement('button')
      btn.textContent = text
      Object.assign(btn.style, {
        padding: '2px 4px',
        fontSize: '11px',
        cursor: 'pointer',
      } as Partial<CSSStyleDeclaration>)
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        handler(ann, action)
        if (action === 'remove') {
          item.remove()
        }
      })
      return btn
    }

    btnGroup.appendChild(makeBtn('Select', 'select'))
    btnGroup.appendChild(makeBtn('Remove', 'remove'))

    item.appendChild(info)
    item.appendChild(btnGroup)
    container.appendChild(item)
  })
}

export function buildShadowUi(extensionUiRoot: HTMLElement) {
  const connector = document.createElement('div')
  const shadowRoot = connector.attachShadow({ mode: 'open' })
  shadowRoot.append(extensionUiRoot)
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(`
    * {
      font-family: courier;
    }
    button {
      border-radius: 8px;
      outline: none;
    }
    table, td {
      border: 1px solid black;
      background-color: white;
    }
  `)
  shadowRoot.adoptedStyleSheets = [sheet]

  return connector
}
