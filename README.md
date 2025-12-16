## UI Annotations

Primarily a chrome browser extension to help me quickly annotate UI elements on webpages, for training computer vision models.
This repo also includes a web server for storing annotations in local postgres instance, and a small frontend for viewing them.

#### TODO

vit transformer saga (1)

* expand on the number of fonts that I currently have please.  how to duplicate fonts from websites in the wild.
* integrate this expanded font set to
* using the chimera pages, write a script (puppeteer I think) to automatically locate specifically labelled elements, and crop them and save in db.
* scraping for special labels
  * need more examples but real ones only.  scrape for these directly
    * ads
    * images
    * logo
    * ad sites:
      https://www.nytimes.com/games/wordle/index.html (gotta press play)
      https://www.nytimes.com/spotlight/lifestyle
      https://www.buzzfeed.com
      https://www.buzzfeed.com/quizzes
      https://www.telegraph.co.uk/
      https://news.yahoo.com/
      https://forbes.com


ui-annotations todo (2)
- frontend
    - clone button (new screen with current annotations but different tag?)
    - predict but do not overwrite.  so I can have screenshot, apply one yolo model, and then another
    - fix broken shit on the annotator (keypress etc)
    - when you click an existing annotation you should be able to drag it. need easier 'finessing' of labels
- service manual detector
    - try leveraging text_region?
    - change service_manual detector to only focus on structural stuff (tables, images, diagrams, diagram_num)
    - create a new textregion detector, built on top of the old one, except it recognizes number reginons (page nums, section num etc)
    - a classifier (vit transformer) (that includes padding in its crop) plus perhaps metadata (y position, neighbouring labels etc) distinguishes between different kinds of text


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








