import { annotationLabels } from "ui-labelling-shared";
import { SALIENT_VISUAL_PROPS, ProjectionType } from "./types";
import { splitArray } from "./util";

const trashCanUrl = chrome.runtime.getURL('/assets/trash-can.svg')

export function getButton(primary?: boolean) {
  const button = document.createElement('button')
  button.style.outline = 'none'
  button.style.border = 'none'
  button.style.minWidth = '140px'
  button.style.fontSize = '16px'
  button.style.padding = '6px'
  button.style.borderRadius = '8px'
  button.style.cursor = 'pointer'
  button.style.backgroundColor = primary
    ? 'green'
    : '#A0C6FC'
  button.style.color = 'white'
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
  formOverlay.style.visibility = 'initial !important';
  formOverlay.style.zIndex = '10'
  return formOverlay
}

// this assumes that the parent must be relatively positioned!!
export function getRemoveIcon(handler?: (event: MouseEvent) => void): HTMLImageElement {
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
  form.style.backgroundColor = 'rgba(255, 255, 255, 0.8)'
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
  const fragment = document.createDocumentFragment();
  const container = document.createElement('div')
  container.className = 'annotation-form'

  const annotationSelect = document.createElement('select')
  container.appendChild(annotationSelect)

  Object.keys(annotationLabels).forEach((s: string) => {
    const option = document.createElement('option')
    option.value = s
    option.innerText = s
    annotationSelect.appendChild(option)
  })

  const buttonContainer = document.createElement('div')
  buttonContainer.style.display = 'flex'
  buttonContainer.style.gap = '8px'
  container.appendChild(document.createElement('hr'))
  container.appendChild(buttonContainer)

  const submitButton = getButton(true)
  submitButton.innerText = 'submit'
  submitButton.setAttribute('type', 'submit')
  buttonContainer.appendChild(submitButton)

  const cancelButton = getButton()
  cancelButton.innerText = 'cancel'
  cancelButton.setAttribute('type', 'button')
  cancelButton.addEventListener('click', handleCancel)
  buttonContainer.appendChild(cancelButton)

  const projectionButton = getButton()
  projectionButton.innerText = 'projection'
  projectionButton.setAttribute('type', 'button')
  projectionButton.addEventListener('click', handleProjection)
  buttonContainer.appendChild(projectionButton)

  fragment.append(container)
  return fragment
}

export function buildProjectionForm({
  handleCancel
}: {
  handleCancel: () => void
}): DocumentFragment {
  const frag: DocumentFragment = document.createDocumentFragment();
  const container: HTMLDivElement = document.createElement('div');
  container.className = 'projection-form';

  /* ---------- radio group ---------- */
  const fieldset: HTMLFieldSetElement = document.createElement('fieldset');
  const legend: HTMLLegendElement = document.createElement('legend');
  legend.textContent = 'Projection type';
  fieldset.appendChild(legend);

  const radioName = 'projectionType';
  const options: { label: string; value: ProjectionType }[] = [
    { label: 'direct siblings', value: 'siblings' },
    { label: 'cousins',        value: 'cousins'  },
    { label: 'visual',         value: 'visual'   }
  ];

  options.forEach(({ label, value }, i) => {
    const lbl: HTMLLabelElement = document.createElement('label');
    const inp: HTMLInputElement = document.createElement('input');
    inp.type = 'radio';
    inp.name = radioName;
    inp.value = value;
    if (i === 0) inp.checked = true;          // default
    lbl.style.display = 'block';
    lbl.append(inp, ` ${label}`);
    fieldset.appendChild(lbl);
  });

  container.appendChild(fieldset);

  /* ---------- dynamic section ---------- */
  const dynamicSection: HTMLDivElement = document.createElement('div');
  dynamicSection.className = 'projection-dynamic';
  container.appendChild(document.createElement('hr'))
  container.appendChild(dynamicSection);

  /* ---------- max input ---------- */
  const maxLabel: HTMLLabelElement = document.createElement('label');
  maxLabel.style.display = 'block';
  maxLabel.textContent = 'max ';
  const maxInput: HTMLInputElement = document.createElement('input');
  maxInput.name = 'max';
  maxInput.value = '10';
  maxLabel.appendChild(maxInput);
  container.appendChild(maxLabel);

  /* ---------- buttons ---------- */
  const buttonContainer = document.createElement('div')
  buttonContainer.style.display = 'flex'
  buttonContainer.style.gap = '8px'

  const submitBtn: HTMLButtonElement = getButton(true);
  submitBtn.setAttribute('id', 'submitBtn')
  submitBtn.type = 'submit';
  submitBtn.textContent = 'Submit';
  buttonContainer.appendChild(submitBtn)

  const cancelBtn: HTMLButtonElement = getButton();
  cancelBtn.setAttribute('id', 'cancelBtn')
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', handleCancel)
  buttonContainer.appendChild(cancelBtn)

  const percentDisplay = document.createElement('p')
  percentDisplay.setAttribute('id', 'percentDisplay')
  percentDisplay.innerText = '0%'
  buttonContainer.appendChild(percentDisplay)

  container.appendChild(document.createElement('hr'))
  container.append(buttonContainer);

  /* ---------- dynamic render ---------- */
  const renderDynamic = (value: ProjectionType): void => {
    // clear the existing content
    dynamicSection.innerHTML = ''

    switch(value) {
      case 'cousins':
        const distLabel: HTMLLabelElement = document.createElement('label');
        distLabel.style.display = 'block';
        distLabel.textContent = 'distance ';
        const distInput: HTMLInputElement = document.createElement('input');
        distInput.type = 'number';
        distInput.name = 'distance';
        distInput.value = '2';
        distLabel.appendChild(distInput);
        dynamicSection.appendChild(distLabel);
        break
      case 'visual':
        dynamicSection.appendChild(buildProjectionCheckboxGroup())
        break
      case 'siblings':
        break
    }
  };

  /* initial render */
  renderDynamic('siblings');

  /* listeners */
  fieldset
    .querySelectorAll<HTMLInputElement>(`input[name="${radioName}"]`)
    .forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.checked) renderDynamic(radio.value as ProjectionType);
      });
    });

  frag.appendChild(container);
  return frag;
}

function buildProjectionCheckboxGroup(visualProps?: string[]): DocumentFragment {
  const props = visualProps ?? SALIENT_VISUAL_PROPS.slice(0)
  const frag      = document.createDocumentFragment();
  const container = document.createElement('div');
  container.className = 'salient-controls';

  const containerInner = document.createElement('div')
  containerInner.style.display = 'flex'
  containerInner.style.gap = '8px'
  container.appendChild(containerInner)
  const splitProps = splitArray<string>({ list: props, len: 4 })
  // checkboxes + labels
  splitProps.forEach(group => {
    const groupContainer = document.createElement('div')
    groupContainer.style.display = 'flex'
    groupContainer.style.flexDirection = 'column'
    group.forEach(prop => {
      const label = document.createElement('label');
      const cb    = Object.assign(document.createElement('input'), {
        type : 'checkbox',
        name : `visual_${prop}`,
        value: prop,
      });
      cb.className = 'visual-style'
      label.style.display = 'block';
      label.append(cb, ` ${prop}`);
      groupContainer.appendChild(label);
    })
    containerInner.appendChild(groupContainer)
  });

  // action buttons
  const checkAllBtn = getButton();
  checkAllBtn.type = 'button';
  checkAllBtn.textContent = 'Check All';

  const clearAllBtn = getButton();
  clearAllBtn.type = 'button';
  clearAllBtn.textContent = 'Clear All';

  // wire up
  checkAllBtn.addEventListener('click', () => {
    containerInner.querySelectorAll('input.visual-style').forEach(cb => {
      (cb as HTMLInputElement).checked = true
    })
  })

  clearAllBtn.addEventListener('click', () => {
    containerInner.querySelectorAll('input.visual-style').forEach(cb => {
      (cb as HTMLInputElement).checked = false
    })
  });

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
      label: 'Tag'
    })
  )
  matchingRulesContainer.appendChild(
    buildCheckboxInput({
      name: 'match_class',
      label: 'Class'
    })
  )
  matchingRulesContainer.appendChild(
    buildCheckboxInput({
      name: 'match_exact',
      label: 'Exact'
    })
  )
  container.append(matchingRulesContainer)

  frag.appendChild(container);
  return frag;
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