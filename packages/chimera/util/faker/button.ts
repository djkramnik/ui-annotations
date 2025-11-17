// util/faker/button.ts
import { randomPick, randInt } from '../random'

export type ButtonLabelKind =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'ghost'
  | 'iconOnly'
  | 'nav'

const PRIMARY_SHORT = [
  'Save',
  'Submit',
  'Continue',
  'Next',
  'Confirm',
  'Apply',
  'Sign in',
  'Sign up',
  'Upload',
  'Download',
]

const PRIMARY_LONG = [
  'Save changes',
  'Continue to checkout',
  'Create account',
  'Start trial',
  'Send message',
  'Request access',
  'Update profile',
  'Add to cart',
  'Place order',
]

const SECONDARY = [
  'Cancel',
  'Back',
  'Close',
  'Skip for now',
  'Remind me later',
  'Maybe later',
  'Not now',
  'Discard',
]

const DANGER = [
  'Delete',
  'Remove',
  'Remove item',
  'Delete account',
  'Reset settings',
  'Clear all',
  'Cancel subscription',
]

const GHOST = [
  'Learn more',
  'View details',
  'View all',
  'Show more',
  'Show less',
  'Preview',
  'Open in new tab',
]

const ICON_ONLY = [
  'Play',
  'Pause',
  'More',
  'Settings',
  'Options',
  'Info',
  'Help',
]

const NAV = [
  'Go home',
  'Back to dashboard',
  'View report',
  'Open settings',
  'Manage users',
  'View notifications',
]

function pickFromKind(kind: ButtonLabelKind): string {
  switch (kind) {
    case 'primary':
      // 50/50 short vs long
      return Math.random() < 0.5
        ? randomPick(PRIMARY_SHORT)
        : randomPick(PRIMARY_LONG)
    case 'secondary':
      return randomPick(SECONDARY)
    case 'danger':
      return randomPick(DANGER)
    case 'ghost':
      return randomPick(GHOST)
    case 'iconOnly':
      return randomPick(ICON_ONLY)
    case 'nav':
      return randomPick(NAV)
    default:
      return randomPick(PRIMARY_SHORT)
  }
}

/**
 * Returns a random button label.
 * If kind is omitted, a random kind is chosen with some bias
 * towards "primary" and "secondary".
 */
export function getRandomButtonLabel(kind?: ButtonLabelKind): string {
  let effectiveKind = kind
  if (!effectiveKind) {
    const roll = randInt(0, 99)
    if (roll < 35) effectiveKind = 'primary'
    else if (roll < 60) effectiveKind = 'secondary'
    else if (roll < 75) effectiveKind = 'ghost'
    else if (roll < 90) effectiveKind = 'nav'
    else effectiveKind = 'danger'
  }

  return pickFromKind(effectiveKind)
}
