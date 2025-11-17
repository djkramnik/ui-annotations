import { randInt, randomPick } from '../random'

// Big mixed-category pool
const LABEL_POOL = [
  // Colors
  'Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange', 'Cyan', 'Magenta',
  'Teal', 'Lime', 'Indigo', 'Violet', 'Coral', 'Maroon', 'Turquoise',

  // Animals
  'Lion', 'Tiger', 'Eagle', 'Falcon', 'Wolf', 'Bear', 'Shark', 'Panther',
  'Fox', 'Raven', 'Owl', 'Dolphin', 'Hawk', 'Coyote', 'Buffalo',

  // Tech-y terms
  'Alpha', 'Beta', 'Gamma', 'Delta', 'Sigma', 'Omega', 'Protocol', 'Payload',
  'Vector', 'Quantum', 'Module', 'Cluster', 'Adapter', 'Bridge', 'Socket',

  // UI words
  'Primary', 'Secondary', 'Tertiary', 'Compact', 'Expanded', 'Minimal',
  'Classic', 'Modern', 'Outline', 'Solid', 'Ghost', 'Surface', 'Muted',

  // Product-style
  'Standard', 'Premium', 'Legacy', 'Basic', 'Essential', 'Ultimate',
  'Plus', 'Lite', 'Pro', 'Ultra', 'Core', 'Edge',

  // Abstract nouns
  'Harmony', 'Focus', 'Momentum', 'Insight', 'Origin', 'Echo', 'Vertex',
  'Nimbus', 'Matrix', 'Spectrum', 'Catalyst', 'Pulse', 'Zenith',

  // Shapes
  'Circle', 'Square', 'Triangle', 'Hexagon', 'Octagon', 'Ellipse',

  // Misc words
  'Mode A', 'Mode B', 'Mode C',
  'Option X', 'Option Y', 'Option Z',
  'Field One', 'Field Two', 'Field Three',
  'State Idle', 'State Active', 'State Sleep',
  'Channel 1', 'Channel 2', 'Channel 3',
  'Profile A', 'Profile B', 'Profile C',

  // Short code-like phrases
  'Alpha-1', 'Beta-2', 'Delta-4', 'Unit-7', 'Node-9', 'Path-12',
  'Group-5', 'Level-8', 'Zone-3', 'Type-6', 'Block-11',
]

/**
 * Generates labels with mixed styles:
 * 40% → single pick
 * 40% → two-word composite
 * 20% → three-part composite
 *
 * No faker. High variety. Readable.
 */
export function getRandomOptionLabels(count: number, unique = true): string[] {
  const makeLabel = () => {
    const roll = Math.random()

    if (roll < 0.4) {
      // Single word
      return randomPick(LABEL_POOL)
    }

    if (roll < 0.8) {
      // Two-part composite
      return `${randomPick(LABEL_POOL)} ${randomPick(LABEL_POOL)}`
    }

    // Three-part composite
    return `${randomPick(LABEL_POOL)} ${randomPick(LABEL_POOL)} ${randomPick(LABEL_POOL)}`
  }

  if (!unique) {
    return Array.from({ length: count }, makeLabel)
  }

  const result = new Set<string>()
  while (result.size < count) {
    result.add(makeLabel())
  }
  return Array.from(result)
}

/**
 * Generates a random default dropdown phrase.
 * Example: "Select one of the following"
 */
export function getRandomDropdownPhrase(): string {
  const PHRASES = [
    // Simple prompts
    "Select one",
    "Choose one",
    "Pick one",
    "Select an option",
    "Choose an option",
    "Pick an option",

    // Slightly longer
    "Select one of the following",
    "Choose from the list",
    "Pick a value from below",
    "Select a value",
    "Choose a value",

    // UI-ish
    "Please select",
    "Please choose",
    "Select an item",
    "Choose an item",
    "Pick a choice",

    // More conversational
    "Make your selection",
    "Select something to continue",
    "Choose something from the list",
    "Choose a field",
    "Pick your option",

    // Short minimal
    "Select…",
    "Choose…",
    "Pick…",

    // Slightly directive
    "Select any option",
    "Choose any item",
    "Pick any value",
  ]

  return PHRASES[Math.floor(Math.random() * PHRASES.length)]
}
