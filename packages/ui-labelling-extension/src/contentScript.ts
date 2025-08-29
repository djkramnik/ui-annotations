import { AnnotationLabel, annotationLabels, gatherInteractiveRegions, gatherTextRegions, isInViewport } from 'ui-labelling-shared'
import {
  _GlobalState,
  Annotation,
  ExtensionMessage,
  getOverlay,
  GlobalState,
  log,
  PredictResponse,
  SALIENT_VISUAL_PROPS,
  shadowId,
  StorageKeys,
} from './types'
import {
  buildAnnotationForm,
  buildAnnotationList,
  buildColorLegend,
  buildForm,
  buildProjectionForm,
  buildShadowUi,
  getFormOverlay,
  getRemoveIconInline,
  populateAnnotationList,
} from './dom-building'
import {
  getBoundingBoxOfText,
  getCousins,
  getDeepActiveElement,
  getSelfishKeyDown,
  getSibs,
  uuidv4,
} from './util'
import { findSimilarUiAsync } from './find-similar-ui'
import { deepElementFromPoint, getChildrenWithShadow, getParentWithShadow, getSiblingsWithShadow, isInShadowRoot, normalizeForNav } from './navigation';

(function () {
  let addKeyDownListener: (listener: (event: KeyboardEvent) => void) => void
  let removeKeyDownListener: (listener: (event: KeyboardEvent) => void) => void

  function main() {
    const globals = _GlobalState(handleGlobalChange)

    chrome.storage.local.set({
      [StorageKeys.meta]: {
        url: window.location.href,
        date: new Date().toLocaleString('en-US', {
          timeZone: 'America/New_York',
        }),
        window: {
          scrollY: window.scrollY,
          width: window.innerWidth,
          height: window.innerHeight,
        },
      },
    })

    log.info('saved metadata')

    if (document.getElementById(globals.shadowId)) {
      log.warn(
        'overlay already present during initialization.  Aborting everything!',
      )
      return null
    }
    const overlay = document.createElement(globals.overlayId)
    overlay.setAttribute('id', globals.overlayId)

    overlay.style.position = 'fixed'
    overlay.style.width = '100vw'
    overlay.style.height = '100vh'
    overlay.style.top = '0'
    overlay.style.left = '0'
    overlay.style.zIndex = '999666999' // obscene

    const shadowMount = buildShadowUi(overlay)
    document.body.appendChild(shadowMount)
    shadowMount.id = globals.shadowId

    const formOverlay = getFormOverlay()

    const projectionForm = buildForm({
      heading: 'Project Element',
      children: buildProjectionForm({
        handleToggleProjectText: (checked) => {
          globals.projectTextNode = checked
        },
        handleCancel: () => {
          globals.state = 'initial'
        },
        handlePreview: () => createProjections(projectionForm),
      }),
      handleSubmit: async (event) => {
        event.preventDefault()
        const submitBtn = projectionForm.querySelector(
          '#submitBtn',
        ) as HTMLButtonElement
        const cancelBtn = projectionForm.querySelector(
          '#cancelBtn',
        ) as HTMLButtonElement
        submitBtn.disabled = true
        cancelBtn.disabled = true
        if (
          !Array.isArray(globals.projections) ||
          globals.projections.length < 1
        ) {
          const proceed = window.confirm('Continue without previewing?')
          if (!proceed) {
            return
          }
          await createProjections(projectionForm, true /**submitting */)
        }

        const annotationSelect = projectionForm.querySelector('select')!

        if (!annotationSelect.value) {
          log.warn('no label selected?')
          showToast({
            type: 'error',
            message: 'No label selected',
            overlay
          })
          return
        }

        const newAnnotations = (globals.projections ?? [])
          .map((p) => ({
            id: uuidv4(),
            ref: p,
            rect: p.getBoundingClientRect(),
            label: annotationSelect.value as AnnotationLabel,
            useTextNode: globals.projectTextNode,
          }))
          .concat(
            globals.currEl !== null
              ? {
                id: uuidv4(),
                ref: globals.currEl,
                rect: globals.currEl.getBoundingClientRect(),
                label: annotationSelect.value as AnnotationLabel,
                useTextNode: globals.projectTextNode,
              }
              : [],
          )

        globals.annotations = globals.annotations.concat(newAnnotations)
        submitBtn.disabled = false
        cancelBtn.disabled = false
        globals.state = 'initial'
      },
    })
    projectionForm.style.display = 'none'

    const annotationForm = buildForm({
      heading: 'Set Label',
      children: buildAnnotationForm({
        handleCancel: () => {
          globals.state = 'initial'
        },
        handleProjection: () => {
          globals.state = 'projection'
        },
      }),
      handleSubmit: (event) => {
        event.preventDefault()
        const form = event.target as HTMLFormElement
        const annotationSelect = annotationForm.querySelector('select')!
        log.info(annotationSelect.value)
        if (!annotationSelect.value) {
          log.warn('no label selected?')
        }

        if (globals.currEl !== null) {
          const useTextNode =
            (form.querySelector('#usetextnode_cb') as HTMLInputElement)
              .checked === true
          globals.annotations = globals.annotations.concat({
            id: uuidv4(),
            ref: globals.currEl,
            rect: globals.currEl.getBoundingClientRect(),
            label: annotationSelect.value as AnnotationLabel,
            useTextNode,
          })
        }

        globals.state = 'initial'
      },
    })

    formOverlay.appendChild(annotationForm)
    formOverlay.appendChild(projectionForm)
    overlay.appendChild(formOverlay)

    // more soup for ya: annotation legend, to show up along with the removable annotations
    // whenever annotation mode is toggled on
    const legend = buildColorLegend(annotationLabels, {
      position: 'absolute',
      top: '12px',
      right: '12px',
      display: 'none',
      pointerEvents: 'none',
      width: '200px',
    })
    overlay.appendChild(legend)
    const [annotationList, annotationListInner] = buildAnnotationList()
    annotationList.style.display = 'none'
    overlay.appendChild(annotationList)

    globals.state = 'initial'

    // state independent keypress events that should always be active
    addKeyDownListener(handleKeyPress)

    // janky redux style state handling mega function
    function handleGlobalChange(key: keyof GlobalState, value: any) {
      // we do not have a good way to cleanup the effects of the previous state change
      // we should define a default state, and then make sure at the start of every side effect change we first
      // return to the default state perhaps?
      switch (key) {
        case 'projectTextNode':
          if (globals.state !== 'projection') {
            return
          }
          // if this toggles *via user action* we should be in projection mode.
          // we want to redraw all the projections if there are any, so we will just update the ref
          // changing nothing else
          if (!Array.isArray(globals.projections)) {
            return
          }
          // this will trigger the case directly below us
          handleGlobalChange('projections', globals.projections)
          break
        case 'projections':
          if (globals.state === 'projection' && Array.isArray(value)) {
            removeRects()
            value.forEach((v, index) => {
              drawRect({
                bbox: globals.projectTextNode
                  ? getBoundingBoxOfText(v as HTMLElement)
                  : (v as HTMLElement).getBoundingClientRect(),
                parent: overlay,
              })
            })
            if (globals.currEl) {
              drawRect({
                bbox: globals.projectTextNode
                  ? getBoundingBoxOfText(globals.currEl)
                  : globals.currEl.getBoundingClientRect(),
                parent: overlay,
                styles: {
                  border: '2px solid blue',
                },
              })
            }
          }

          log.info('update to projections', value)
          break
        case 'annotations':
          chrome.storage.local.set({
            [StorageKeys.annotations]: JSON.stringify(value),
          })
          log.info('update to annotations', value)
          break
        case 'currEl':
          if (globals.state === 'navigation' && value) {
            removeRects()
            drawCandidate({
              element: value as HTMLElement,
              parent: overlay,
            })
          }
          log.info('update to currEl', value)
          break
        case 'state':
          formOverlay.style.display = 'none'
          overlay.removeEventListener('mousedown', _handleMouseWrap)
          removeKeyDownListener(handleNavigationKeyPress)

          if (value === 'initial') {
            removeRects()
            globals.projections = []
            globals.projectTextNode = false
              ; (
                projectionForm.querySelector(
                  '#usetextnodeprojection_cb',
                ) as HTMLInputElement
              ).checked = false // beyond good and evil
            overlay.addEventListener('mousedown', _handleMouseWrap)
            log.info('added mousedown listener')
          } else if (value === 'projection') {
            showProjectionPopup()
          } else if (value === 'navigation') {
            addKeyDownListener(handleNavigationKeyPress)
          } else if (value === 'confirmation') {
            showConfirmationPopup()
          }

          log.info('update to state', value)
          break
        case 'showAnnotations':
          log.info('show annotations handler', value)

          // only show annotationList if state is also initial?
          legend.style.display = 'none'
          annotationList.style.display = 'none'
          annotationListInner.innerHTML = ''

          if (value) {
            // very messy now..
            if (globals.state === 'initial') {
              overlay.removeEventListener('mousedown', _handleMouseWrap)
            }

            legend.style.display = 'initial'
            annotationList.style.display = 'initial'
            populateAnnotationList({
              container: annotationListInner,
              handler: (annotation: Annotation, action: 'select' | 'remove') => {
                const element = getOverlay(globals)!.querySelector('#show_annotation_' + annotation.id) as HTMLElement
                if (!element) {
                  log.warn('could not find element from annotation list', annotation)
                  return
                }
                switch (action) {
                  case 'select':
                    // very janky shit but I don't want to add more state
                    // find the dom element if any passed on the id formulat below
                    // change the border color for a few moments then revert

                    element.style.border = `2px solid red`
                    // in three seconds abruptly change back
                    window.setTimeout(() => {
                      element.style.border = `2px solid` + annotationLabels[annotation.label]
                    }, 3000)
                    break
                  case 'remove':
                    // remove from state
                    globals.annotations = globals.annotations.filter(
                      (a) => a !== annotation,
                    )
                    // remove the ui representation as well
                    element.remove()
                    break
                }
              },
              annotations: globals.annotations
            })

            globals.annotations.forEach((anno) => {
              const { id, ref, label, useTextNode } = anno
              const c = annotationLabels[label]
              let removeIcon: HTMLElement | undefined = undefined
              getRemoveIconInline((event) => {
                event.stopPropagation()
                // filter annotation out of the global state var
                globals.annotations = globals.annotations.filter(
                  (a) => a !== anno,
                )
                // fragile
                removeIcon?.parentElement?.remove()
              }).then(svg => {
                removeIcon = svg
                drawRect({
                  id: 'show_annotation_' + id,
                  bbox: useTextNode
                    ? getBoundingBoxOfText(ref)
                    : ref.getBoundingClientRect(),
                  parent: overlay,
                  styles: {
                    border: '2px solid ' + c,
                    backgroundColor: c,
                    opacity: '0.9',
                    zIndex: '2',
                  },
                  child: removeIcon,
                })
              })
            })
          } else {
            removeRects('[id^="show_annotation_"]')
            if (globals.state === 'initial') {
              console.log('adding back event listener for initial state')
              overlay.addEventListener('mousedown', _handleMouseWrap)
            }
          }
          break
        default:
          log.info('undefined globals change', key, value)
      }
    }

    // CALLBACK SOUP

    function createProjections(form: HTMLFormElement, submitting?: boolean) {
      const submitBtn = form.querySelector('#submitBtn') as HTMLButtonElement
      const cancelBtn = form.querySelector('#cancelBtn') as HTMLButtonElement
      const percentDisplay = form.querySelector(
        '#percentDisplay',
      ) as HTMLButtonElement
      submitBtn.disabled = true
      cancelBtn.disabled = true

      const formData = Object.fromEntries(new FormData(form).entries())
      if (!globals.currEl) {
        log.error('somehow we are projecting but have no currEl ref')
        return
      }
      // console.log('projection type', formData['projectionType'])
      // console.log('max', formData['max'])
      SALIENT_VISUAL_PROPS.forEach((prop) => {
        console.log('visual style', prop, formData[`visual_${prop}`])
      })
      // console.log('distance', formData['distance'])
      const projectionType = formData['projectionType']
      const distance = parseInt(String(formData['distance']), 10)
      const max = parseInt(String(formData['max']), 10)
      let task: ((el: HTMLElement) => Promise<HTMLElement[]>) | null = null

      switch (projectionType) {
        case 'siblings':
          task = (el: HTMLElement) => {
            const sibs = getSibs(el)
            console.log('siblings??', sibs)
            return Promise.resolve(sibs)
          }
          break
        case 'cousins':
          task = (el: HTMLElement) => {
            const cousins = getCousins({
              target: el,
              distance: Number.isNaN(distance) ? 0 : distance,
            })
            console.log('cousins??', cousins)
            return Promise.resolve(cousins)
          }
          break
        case 'visual':
          const props = {
            matchTag: formData['match_tag'] === 'on',
            matchClass: formData['match_class'] === 'on',
            exact: formData['match_exact'] === 'on',
            max: Number.isNaN(max) ? 10 : Math.max(1, max),
            keys: SALIENT_VISUAL_PROPS.filter((s) => {
              return formData[`visual_${s}`] === s
            }),
          }
          task = async (el: HTMLElement) => {
            for await (const update of findSimilarUiAsync(props, el)) {
              if (update.done) {
                return update.results
              }
              log.info('progress: ', update.percentComplete)
              percentDisplay.innerText = update.percentComplete.toFixed(2) + '%'
            }
            return []
          }
          break
        default:
          log.warn('unsupported projection type?', projectionType)
          break
      }

      if (!task) {
        log.info('no projection task!')
        return
      }
      submitBtn.style.backgroundColor = '#eee'
      cancelBtn.style.backgroundColor = '#eee'

      // disable the submit button... finally restore the submit button
      return task(globals.currEl)
        .then((results: HTMLElement[]) => {
          console.log('projections???', results)
          globals.projections = results
            .filter((el) => isInViewport({ target: el }))
            .slice(0, Number.isNaN(max) ? undefined : max)

          if (!submitting) {
            // hide form until key is pressed
            form.style.display = 'none'
            showToast({
              type: 'success',
              message: 'Preview Mode. Press any key to end preview',
              overlay
            })
            addKeyDownListener(function endPreview() {
              form.style.display = 'initial'
              removeKeyDownListener(endPreview)
            })
          }
        })
        .finally(() => {
          submitBtn.disabled = false
          cancelBtn.disabled = false
          submitBtn.style.backgroundColor = 'green'
          cancelBtn.style.backgroundColor = '#A0C6FC'
          percentDisplay.innerText = '0%'
        })
    }

    function showConfirmationPopup() {
      formOverlay.style.display = 'flex'
      annotationForm.style.display = 'initial'
      projectionForm.style.display = 'none'
    }

    function showProjectionPopup() {
      formOverlay.style.display = 'flex'
      annotationForm.style.display = 'none'
      projectionForm.style.display = 'initial'
    }

    function _handleMouseWrap(event: MouseEvent) {
      log.info('_handleMouseWrap')
      overlay.style.pointerEvents = 'none'
      overlay.removeEventListener('mousedown', _handleMouseWrap)
      setTimeout(() => {
        try {
          handleMouseDown(event, overlay)
        } catch (err) {
          log.error(err)
        } finally {
          overlay.style.pointerEvents = 'initial'
        }
      }, 0)
    }

    function handleMouseDown(event: MouseEvent, overlay: HTMLElement) {
      log.info('_handleMouseDown', event)
      if (globals.state !== 'initial') {
        log.warn('I shall return', globals)
        return
      }

      const mx = event.clientX
      const my = event.clientY
      const hit = deepElementFromPoint(mx, my) as HTMLElement
      const realTarget = hit ? normalizeForNav(hit) : null
      overlay.style.pointerEvents = 'initial'

      log.info('real target?', realTarget)

      if (
        !realTarget ||
        typeof realTarget.getBoundingClientRect !== 'function'
      ) {
        log.warn('no real target found', realTarget)
        overlay.addEventListener('mousedown', _handleMouseWrap)
        return
      }

      // prevent overly big annotations
      if (
        realTarget.clientWidth > overlay.clientWidth * 0.9 &&
        realTarget.clientHeight > overlay.clientHeight * 0.9
      ) {
        log.warn('annotation too big. skipping', realTarget)
        overlay.addEventListener('mousedown', _handleMouseWrap)
        return
      }

      log.info('real target found', realTarget)

      // create a bounding box on the overlay with all the associated doodads and callbacks
      globals.state = 'navigation'
      globals.currEl = realTarget
    }

    function removeRects(selector: string = '[id*="candidate_annotation_"]') {
      Array.from(getOverlay(globals)!.querySelectorAll(selector)).forEach((el) =>
        el.remove(),
      )
    }

    function drawRect({
      bbox,
      parent,
      styles,
      id,
      child,
    }: {
      bbox: DOMRect,
      parent: HTMLElement
      styles?: Partial<Record<keyof CSSStyleDeclaration, string>>
      id?: string
      child?: Element
    }) {
      const annotation = document.createElement('div')

      const { top, left, width, height } = bbox

      annotation.setAttribute(
        'id',
        id ?? `${'candidate_annotation_'}${new Date().getTime()}`,
      )
      annotation.style.position = 'fixed'
      annotation.style.width = width + 'px'
      annotation.style.height = height + 'px'
      annotation.style.top = top + 'px'
      annotation.style.left = left + 'px'
      annotation.style.boxSizing = 'border-box'

      // override styles if any
      if (styles) {
        Object.entries(styles).forEach(([k, v]) => {
          // @ts-ignore
          annotation.style[k] = v
        })
      } else {
        annotation.style.border = `2px solid #0FFF50`
      }

      // custom child element if any
      if (child) {
        annotation.appendChild(child)
      }
      parent.appendChild(annotation)
    }

    // when we draw a candidate for annotation, we also want to include some nav helpers
    // (direct children and siblings that match criteria)
    function drawCandidate({
      element,
      parent,
    }: {
      element: HTMLElement
      parent: HTMLElement
    }) {
      drawRect({
        bbox: element.getBoundingClientRect(),
        parent,
      })
      // get siblings.. drawRect on them
      const siblings = getSiblingsWithShadow(element)

      siblings.forEach((sib, index) => {
        drawRect({
          id: `candidate_annotation_sib_${index}`,
          bbox: sib.getBoundingClientRect(),
          parent,
          styles: {
            border: `2px solid #D3D3D370`,
            backgroundColor: '#D3D3D330',
          },
        })
      })
    }

    // this is active only when the global state is "navigation"
    function handleNavigationKeyPress(event: KeyboardEvent) {
      if (!globals.currEl) {
        log.error('no current element to navigate from')
        return
      }
      const curr = globals.currEl as HTMLElement
      const parent: HTMLElement | null = getParentWithShadow(curr)
      const thisGeneration: HTMLElement[] = parent
        ? getChildrenWithShadow(parent)
        : []

      const currIndex: number | null = parent
        ? thisGeneration.indexOf(curr)
        : -1

      let newIndex
      log.info('keypressed', event.key)

      switch (event.key) {
        // quit navigation mode and return to initial
        case 'q':
          globals.state = 'initial'
          break
        // arrow left
        case 'j':
          if (!parent || currIndex === -1) {
            log.warn('arrowleft', parent
              ? 'could not find current node among children'
              : 'cannot find parent node')
            break
          }
          if (thisGeneration.length < 2) {
            log.warn('arrowleft', 'no siblings')
            break
          }
          newIndex = currIndex - 1
          if (newIndex < 0) {
            newIndex = thisGeneration.length - 1
          }
          globals.currEl = thisGeneration[newIndex]
          break
        // arrow right
        case 'l':
          if (!parent || currIndex === -1) {
            log.warn('arrowright', parent
              ? 'could not find curr node among children'
              : 'cannot find parent node')
            break
          }
          if (thisGeneration.length < 2) {
            log.warn('arrowright', 'no siblings')
            break
          }
          newIndex = currIndex + 1
          if (newIndex > thisGeneration.length - 1) {
            newIndex = 0
          }
          globals.currEl = thisGeneration[newIndex] as HTMLElement
          break
        // arrow up
        case 'i':
          if (
            !parent || parent === document.body
          ) {
            log.warn('arrowup', parent
              ? 'parent is document body'
              : 'no parent node')
            break
          }

          globals.currEl = parent
          break
        // arrow down
        case 'k':
          const currChildren = getChildrenWithShadow(curr)
          if (!currChildren.length) {
            log.warn('arrowdown', 'no children', curr)
            break
          }
          globals.currEl = currChildren[0]
          break
        // after settling on what to label, hit enter to bring up label dropdown
        case 'Enter':
          globals.state = 'confirmation'
          break
        case 'p':
          globals.state = 'projection'
          break
      }
    }

    // this is always active, regardless of the global state value.
    // TODO some kind of type system to prevent event key collision on keypress handling...
    function handleKeyPress(event: KeyboardEvent) {
      switch (event.key) {
        case 'a':
          log.info('toggling annotations')
          globals.showAnnotations = !globals.showAnnotations
          break
      }
    }

    // END CALLBACK SOUP

    // SO CALLED UTILS

    function traverseUp(
      el: HTMLElement,
    ): HTMLElement | null {
      if (el === document.body) {
        return null
      }
      const parent = el.parentElement
      if (!parent) {
        return null
      }
      return parent
    }

    function traverseDown(
      el: HTMLElement,
    ): HTMLElement | null {
      if (el.children.length < 1) {
        return null
      }
      return Array.from(el.children)[0] as HTMLElement
    }

    // END OF SO CALLED UTILS
    return globals
  }

  function showToast({
    type,
    message,
    persist,
    overlay
  }: {
    overlay: HTMLElement
    type: 'error' | 'success'
    message: string
    persist?: number
  }): void {
    // ── Ensure wrapper + inner exist exactly once ────────────────────────────────
    let wrapper = overlay.querySelector<HTMLDivElement>('#ui-annotation-toast')

    if (!wrapper) {
      // build new DOM
      wrapper = document.createElement('div')
      wrapper.id = 'ui-annotation-toast'
      wrapper.style.cssText = `
        pointer-events: none;
        position: absolute;
        z-index: 1;
        top: 0;
        width: 100vw;
        height: 50px;
        display: flex;
      `

      const _inner = document.createElement('div')
      _inner.id = 'ui-annotation-toast-inner'
      _inner.style.cssText = `
        width: 200px;
        height: 100%;
        color: white;
        margin: auto;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 1s;
        opacity: 0;
      `

      wrapper.appendChild(_inner)
      overlay.appendChild(wrapper)
    }

    const inner = wrapper.querySelector<HTMLDivElement>(
      '#ui-annotation-toast-inner',
    )!

    inner.style.backgroundColor = type === 'success' ? 'limegreen' : 'red'
    inner.textContent = message

    inner.style.opacity = '1'
    setTimeout(
      () => {
        inner.style.opacity = '0'
      },
      (persist ?? 5) * 1000,
    ) // persist for n seconds then fade out
  }

  // scroll disable and enable
  let scrollY = 0

  function lockScroll() {
    // save the current position
    scrollY = window.scrollY

    // fix the body in place
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
    document.body.style.overflow = 'hidden' // extra belt & suspenders
  }

  function unlockScroll() {
    // restore styles
    document.body.style.position = ''
    document.body.style.top = ''
    document.body.style.left = ''
    document.body.style.right = ''
    document.body.style.overflow = ''

    // pop back to where the user was
    window.scrollTo(0, scrollY)
  }
  // end scroll locking

  function showPredictions(prediction: Pick<PredictResponse, 'boxes' | 'class_names'> & {
    imgW: number
    imgH: number
  }) {
    console.log('very exciting to show this prediction!!!')
    const { boxes, class_names, imgW, imgH } = prediction
    const existingOverlay = document.getElementById('prediction-viewer')
    if (existingOverlay) {
      existingOverlay.remove()
    }
    const overlay = document.createElement('div')
    overlay.setAttribute('id', 'prediction-viewer')

    overlay.style.position = 'fixed'
    overlay.style.width = '100vw'
    overlay.style.height = '100vh'
    overlay.style.top = '0'
    overlay.style.left = '0'
    overlay.style.zIndex = '999666999' // obscene

    const viewportCssW = window.innerWidth;
    const viewportCssH = window.innerHeight;
    const scaleX = imgW / viewportCssW;
    const scaleY = imgH / viewportCssH;

    boxes.forEach((b: number[], i: number) => {
      const [x1, y1, x2, y2] = b;
      const left = x1 / scaleX;
      const top = y1 / scaleY;
      const width = (x2 - x1) / scaleX;
      const height = (y2 - y1) / scaleY;

      const el = document.createElement("div");
      Object.assign(el.style, {
        position: "absolute",
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        border: "2px solid #00ff00",
        boxSizing: "border-box",
        background: "rgba(0,255,0,0.10)",
        pointerEvents: "none",
      });

      // label
      const label = document.createElement("div");
      label.textContent = `${class_names?.[i] ?? ""}`.trim();
      Object.assign(label.style, {
        position: "absolute",
        left: "0",
        top: "-18px",
        font: "12px/1.2 system-ui, sans-serif",
        color: "#fff",
        background: "rgba(0,0,0,0.7)",
        padding: "1px 4px",
        borderRadius: "3px",
        pointerEvents: "none",
        whiteSpace: "nowrap",
      });
      el.appendChild(label);

      overlay!.appendChild(el);
    })

    document.body.appendChild(overlay)
  }
  function removePredictions() {
    document.getElementById('prediction-viewer')?.remove()
  }

  let globalsRef: null | GlobalState = null
  const keyDownController = getSelfishKeyDown(
    function omitHandling(e: KeyboardEvent) {
      // if the active / focused element is within the shadow dom, document.activeElement will only return the host
      const activeEl = getDeepActiveElement(document)

      if (!activeEl) {
        return false
      }
      const shadowMount = document.getElementById(shadowId)
      if (!(shadowMount?.shadowRoot)) {
        console.error('could not get a reference to our own shadow root smh')
        return false
      }
      if (!isInShadowRoot(activeEl, shadowMount.shadowRoot)) {
        return false
      }
      console.log('so this element is guaranteed to be in our shadow root huh', activeEl)
      // we don't want our keydown handlers invoked if the focus is on a form element
      return activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        (activeEl as HTMLElement).isContentEditable
    }
  )
  chrome.runtime.onMessage.addListener((message: { type?: string, content: null | Record<string, any> }) => {
    log.info('content script received message', message)
    if (typeof message?.type !== 'string') {
      log.error('Could not parse runtime message', message)
      return
    }

    switch (message.type) {
      // wet code.  this can be dryed out alongside its gather text twin
      case ExtensionMessage.gatherInteractiveRegions:
        console.log('GATHER INTERACTIVE REGIONS')
         ;(async () => {
          let interactiveBoxes: DOMRect[] = []
          for await (const chunk of gatherInteractiveRegions({ batchSize: 50 })) {
            if (Array.isArray(chunk)) {
              console.log("Batch size:", chunk.length);
              interactiveBoxes = interactiveBoxes.concat(chunk)
            } else {
              console.warn("Unknown chunk type:", chunk);
            }
          }
          console.log('fruits of the gathering:', interactiveBoxes.length)

          for (const r of interactiveBoxes) {
            const div = document.createElement("div");
            div.className = "interactive_annotation"
            Object.assign(div.style, {
              position: "fixed",
              left: `${r.left}px`,
              top: `${r.top}px`,
              width: `${r.width}px`,
              height: `${r.height}px`,
              outline: "1px solid red",
              pointerEvents: "none",
              zIndex: "2147483647",
            });
            document.documentElement.appendChild(div);
          }

          chrome.storage.local.set({
            [StorageKeys.meta]: {
              url: window.location.href,
              date: new Date().toLocaleString('en-US', {
                timeZone: 'America/New_York',
              }),
              window: {
                scrollY: window.scrollY,
                width: window.innerWidth,
                height: window.innerHeight,
              },
            },
          })

          chrome.storage.local.set({
            [StorageKeys.annotations]: JSON.stringify(
              interactiveBoxes.map(r => ({
                id: uuidv4(),
                ref: null, // not a proper annotation but we discard this anyway
                rect: r,
                label: AnnotationLabel.interactive
              }))
            ),
          })

        })()
        break
      // you shouldn't click Gather Text (or interactive) in conjunction with anything else.
      // the spaghetti is now my master
      // so basically you navigate to page, click gather text, export, and then end.  trying this
      // in conjunction with start or vice versa is unpredictable but almost certainly will lead to errors
      case ExtensionMessage.gatherTextRegions:
        console.log('GATHERING TEXT')
        ;(async () => {
          let textRegionBoxes: DOMRect[] = []
          for await (const chunk of gatherTextRegions({ batchSize: 50 })) {
            if (Array.isArray(chunk)) {
              console.log("Batch size:", chunk.length);
              textRegionBoxes = textRegionBoxes.concat(chunk)
            } else {
              console.warn("Unknown chunk type:", chunk);
            }
          }
          console.log('fruits of the gathering:', textRegionBoxes.length)

          for (const r of textRegionBoxes) {
            const bb = r; // DOMRectReadOnly
            const div = document.createElement("div");
            div.className = "text_region_annotation"
            Object.assign(div.style, {
              position: "fixed",
              left: `${bb.left}px`,
              top: `${bb.top}px`,
              width: `${bb.width}px`,
              height: `${bb.height}px`,
              outline: "1px solid red",
              pointerEvents: "none",
              zIndex: "2147483647",
            });
            document.documentElement.appendChild(div);
          }

          chrome.storage.local.set({
            [StorageKeys.meta]: {
              url: window.location.href,
              date: new Date().toLocaleString('en-US', {
                timeZone: 'America/New_York',
              }),
              window: {
                scrollY: window.scrollY,
                width: window.innerWidth,
                height: window.innerHeight,
              },
            },
          })

          chrome.storage.local.set({
            [StorageKeys.annotations]: JSON.stringify(
              textRegionBoxes.map(r => ({
                id: uuidv4(),
                ref: null, // not a proper annotation but we discard this anyway
                rect: r,
                label: AnnotationLabel.textRegion
              }))
            ),
          })

        })()
        break
      case ExtensionMessage.predict:
        console.log('predict event!')
        if (message.content === null) {
          log.warn('impossible state; predict event with no data')
          break
        }
        log.info('PREDICT JUST ARRIVED:', message.content)
        showPredictions(message.content as any)
        window.addEventListener('keypress', removePredictions)
        break
      case ExtensionMessage.exportFailed:
        if (globalsRef === null) {
          log.warn('how could we have no globals ref after export')
          return
        }
        showToast({
          type: 'error',
          message: 'EXPORT FAILED',
          overlay: getOverlay(globalsRef)!
        })
        break
      case ExtensionMessage.exportSuccess:
        if (globalsRef === null) {
          log.warn('how could we have no globals ref after export')
          return
        }
        globalsRef.annotations = []
        showToast({
          type: 'success',
          message: 'EXPORTED SUCCEEDED',
          overlay: getOverlay(globalsRef)!
        })
        break
      case ExtensionMessage.clean:
        // clean up after textregion / interactive display before exporting
        document.querySelectorAll('.text_region_annotation, .interactive_annotation')
          .forEach(el => el.remove())
        if (globalsRef === null) {
          log.warn('request for clean up but we have no global state')
          return
        }
        globalsRef.state = 'initial' // this will trigger a removal of all the decorations from the overlay
        globalsRef.showAnnotations = false
        break
      case ExtensionMessage.turnOffExtension:
        document.getElementById(shadowId)?.remove()
        globalsRef = null
        unlockScroll()
        // stop event-blocking all the page listeners
        keyDownController.removeThyself()
        break
      case ExtensionMessage.startMain:
        removePredictions()
        window.removeEventListener('keypress', removePredictions)
        keyDownController.init()
        keyDownController.removeAllListeners()
        addKeyDownListener = keyDownController.addKeyDownListener
        removeKeyDownListener = keyDownController.removeKeyDownListener
        const mount = document.querySelector(shadowId)
        if (mount) {
          // TODO.  clean up here instead of running away
          log.warn(
            'request to run main but overlay already present on this page.',
          )
          return
        }
        globalsRef = main()

        lockScroll()
        break
    }
  })
})()
