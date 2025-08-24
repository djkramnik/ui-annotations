## UI Annotations

Primarily a chrome browser extension to help me quickly annotate UI elements on webpages, for training computer vision models.
This repo also includes a web server for storing annotations in local postgres instance, and a small frontend for viewing them.

#### TODO

#### QOL / BUGS

* reset the toggle text / shrink to text node checkboxes to false after each submit
* export should call end at the same time.  buttons like start / end / export should be disabled if appropriate
* for visual projection, check everything by default and restore to this default state after each submit
* projection can result in invisible elements getting added.  confirm this on the test-site.  confirm a fix likewise
* before navigating away can we notify if no export was performed


#### Data The Gathering

* Highly granular label list -- max accuracy
* first training run - try for min 500 per label
* Broader yet still granular label list
* consider an algorithm for grouping close elements
* Collect data
a
#### First label definitions
* Button:
  * visual button with some kind of outline.  Can contain text or text with icon but pure icon is another category
  * If it's got too much crap inside it's not a button.  That is anything more than a textwrap for layout

* Heading:
Prominent text whose primary function is to name or contextualize a page or section, typically visually distinguished by size, weight, or placement relative to surrounding text.

Include (yes):

Page titles, section titles, card titles, widget headers.

Bold/large text that acts as an entry point into content below it.

Text at the top of a logical content group (e.g., “Specifications,” “Customer Reviews”).

Exclude (no):

Button text (belongs to button).

Labels for controls (e.g., “Email” above an input).

Standalone emphasized words inside copy (e.g., bold inline words).

Decorative big text that doesn’t title anything (e.g., a hero banner with random marketing words, unless it really is the page’s title).

* Input:
  * editable text form field
  * if coupled with other elements (a search button) I am including the whole thing
  * does not include textareas (multiline)

#### Nice to haves (Future)
* can we fix shadow dom navigation
* can we account for shadow dom when projecting to other elements
* can we have a way of testing the visual similarity of two elements? (compare mode)
* can we have a way of testing for the separation between two dom nodes (cousins)
* can we have clean code (no)

### UI Labelling Extension

When this extension is active on a page, an overlay is placed over the viewport.  The user can
click an element on the page, and a bounding box of the target will be drawn.  This bounding box is then paired with a label and saved as training data annotation.

The extension is in one of four states, 'dormant', 'initial', 'navigation', 'confirmation'

#### Dormant

The extension state starts as `dormant`.  Then it gets switched to `initial`.  This is a nothing burger.  I can't remember why I created this state value, but having it could be useful in that setting the state to `initial` causes a change at the beginning, invoking listeners that bootstrap the default `initial` state.

#### Initial

When the extension loads, it sets the state to `initial`. This is the real default state of the extension.  In this state, we listen for mousedown events, call the mysteriously named `_handleMouseWrap`, which does some housekeeping (i.e. prevents double clicks) before calling the real mousedown logic in `handleMouseDown`.  From the mouse coordinates it finds the element that was clicked, saves it in the global variable `currEl` and switches the global state to  `navigation`.  A bordered rectangle is drawn over the `currEl` box on the page, and other boxes styled differently are drawn around the DOM siblings of the element.  This is to give the user a sense of not just what they clicked, but what neighbouring dom elements are in that container.

#### Navigation

In this state, we listen for certain keypresses in `handleNavigationKeyPress`.
* `q`: QUIT.  abort the navigation state and return to initial state above.
* `j`: LEFT.  change the `currEl` (the candidate annotation) to the sibling prior to the current element
* `l`: RIGHT.  change the `currEl` (the candidate annotation) to the sibling following the current element
* `i`: UP.  Traverse up the DOM until we find the first parent or grandparent element that has a bounding box of different shape than the `currEl`.
* `k`: DOWN.  Traverse down the DOM  until we find the first child or grandchild element that has
a bounding box of different shape than the `currEl`.

When we navigate via `ijkl` keys, and the `currEl` changes, the ui renders new bounding boxes.

* Enter: SELECT THE CURR ELEMENT TO SAVE AS AN ANNOTATION.  This changes the global state to `confirmation`

#### Confirmation
A popup is shown in which the user can choose an existing label to pair with the candidate annotation.  If the form is submitted, then the annotation (bounding box) is saved in the global annotation array.

#### Displaying Annotations
Elements that have been thus save as annotations can be displayed or toggled by pressing the `a` key, regardless of the current global state.  The displayed annotations have a trash icon that,
if clicked, remove that annotation from the state.

#### Saving Annotations to DB
Clicking the extension icon produces a small popup with an export option.  Exporting will save all the current annotations, along with metadata about the current url, viewport dimensions and time of day, to the database.  THIS IS OUR TRAINING DATA.

#### Build and Test Extension
1. `npm run build:extension`.  This will create or update a `dist` folder in the `ui-labelling-extension` package root.
2. Go to `chrome://extensions`. Make sure "Developer Mode" is toggled on.
3. Click "Load unpacked".  Select the `dist` folder created in the build step as the location to unpack.  It should contain a `manifest.json` file.
4.  Navigate to a page. Adjust the viewport and scroll to the desired part of the page where you want to collect those juicy annotations.  Click the `Start` button to begin.








