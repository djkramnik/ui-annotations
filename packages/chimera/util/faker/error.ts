// util/faker/error.ts
import { randomPick } from '../random'

export type FieldErrorState = {
  error: boolean
  helperText?: string
}

const GENERIC_ERRORS = [
  'This field is required.',
  'Please enter a valid value.',
  'Value is too short.',
  'Value is too long.',
  'Invalid characters detected.',
  'Please check this entry.',
  'This doesn’t look quite right.',
]

const EMAIL_ERRORS = [
  'Please enter a valid email address.',
  'Email address is incomplete.',
  'Email domain is not allowed.',
]

const PASSWORD_ERRORS = [
  'Password is too weak.',
  'Password must be at least 8 characters.',
  'Password must contain a number.',
  'Password must contain a special character.',
]

const NUMBER_ERRORS = [
  'Please enter a valid number.',
  'Value must be greater than zero.',
  'Value must be an integer.',
]

type FieldKind = 'generic' | 'email' | 'password' | 'number'

function getErrorPool(kind: FieldKind): string[] {
  switch (kind) {
    case 'email':
      return EMAIL_ERRORS
    case 'password':
      return PASSWORD_ERRORS
    case 'number':
      return NUMBER_ERRORS
    default:
      return GENERIC_ERRORS
  }
}

/**
 * Returns a random validation error state.
 * With the given probability, returns `error: true` + `helperText`,
 * otherwise `error: false`.
 */
export function getRandomFieldError(
  kind: FieldKind = 'generic',
  probability = 0.4,
): FieldErrorState {
  if (Math.random() > probability) {
    return { error: false }
  }

  const pool = getErrorPool(kind)
  const helperText = randomPick(pool)

  return {
    error: true,
    helperText,
  }
}
