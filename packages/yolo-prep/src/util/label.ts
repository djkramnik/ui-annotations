export const getLabelsForImage = (imgPath: string): string[] => {
  throw Error('hi')
}

// this relies on the fact that the image files within the imageDir
// are of the format {screenId}.{ext}.  If this is not true this whole thing breaks.
// we hardcode the logic that for a given image, {name}.{ext} the corresponding label file is {name}.txt
export const getLabelsForImages = async ({
  imageDir,
  labelDir,
  getLabels
}: {
  imageDir: string
  labelDir: string
  getLabels: (imgPath: string) => string[]
}) => {

}