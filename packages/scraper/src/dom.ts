/// <reference lib="dom" />

import { AnnotationLabel, gatherTextRegions, TextProposal } from "ui-labelling-shared";

export function getHnHrefs() {
  return Array.from(
    document.querySelectorAll('.submission .titleline a')
  ).map(a => (a as HTMLAnchorElement).href)
}

export async function getFirstTextProposal(): Promise<TextProposal[]> {
  let textProposals: TextProposal[] = []
  for await (const proposals of gatherTextRegions({ batchSize: 50 })) {
    if (Array.isArray(proposals)) {
      console.log("Batch size:", proposals.length);
      textProposals = textProposals.concat(proposals)
    } else {
      console.warn("Unknown chunk type:", proposals);
    }
  }

  return textProposals
}
