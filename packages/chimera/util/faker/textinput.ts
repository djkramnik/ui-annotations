// util/faker/textinput.ts
import { randomPick } from '../random'

export type TextInputFlavor =
  | 'name'
  | 'email'
  | 'password'
  | 'username'
  | 'phone'
  | 'company'
  | 'jobTitle'
  | 'city'
  | 'postalCode'
  | 'addressLine'
  | 'amount'
  | 'quantity'
  | 'url'
  | 'search'
  | 'generic'

const TEXT_INPUT_LABELS: Record<TextInputFlavor, string[]> = {
  name: ['Name', 'Full name', 'First name', 'Last name'],
  email: ['Email', 'Email address', 'Work email', 'Contact email'],
  password: ['Password', 'New password', 'Create password'],
  username: ['Username', 'User ID', 'Handle'],
  phone: ['Phone', 'Phone number', 'Mobile number', 'Contact number'],
  company: ['Company', 'Organization', 'Business name'],
  jobTitle: ['Job title', 'Role', 'Position'],
  city: ['City', 'Town', ' municipality'],
  postalCode: ['Postal code', 'ZIP code'],
  addressLine: ['Address', 'Street address', 'Address line 1'],
  amount: ['Amount', 'Total amount', 'Price'],
  quantity: ['Quantity', 'Items', 'Units'],
  url: ['Website', 'URL', 'Homepage'],
  search: ['Search', 'Search query', 'Keyword'],
  generic: [
    'Title',
    'Summary',
    'Description',
    'Reference',
    'Code',
    'Identifier',
    'Note',
    'Comment',
  ],
}

const TEXT_INPUT_PLACEHOLDERS: Partial<Record<TextInputFlavor, string[]>> = {
  name: [
    'e.g. Alex Johnson',
    'Enter your full name',
    'First and last name',
  ],
  email: [
    'you@example.com',
    'name@company.com',
    'Enter a valid email',
  ],
  password: [
    'At least 8 characters',
    'Use a strong password',
    'Add a secure password',
  ],
  username: [
    'e.g. alexj',
    'Pick a unique username',
    'Letters, numbers, and underscores',
  ],
  phone: [
    'e.g. (555) 123-4567',
    'Include country code if needed',
    'Your best contact number',
  ],
  company: [
    'e.g. Acme Inc.',
    'Your organization name',
    'Company or team name',
  ],
  jobTitle: [
    'e.g. Product Manager',
    'Your role in the company',
    'Official job title',
  ],
  city: [
    'e.g. Toronto',
    'City or town',
    'Where you live or work',
  ],
  postalCode: [
    'e.g. M5V 2T6',
    'ZIP or postal code',
    'Used for shipping and billing',
  ],
  addressLine: [
    'Street, number, and unit',
    'e.g. 123 Main St, Apt 4B',
    'Primary address line',
  ],
  amount: [
    'e.g. 149.99',
    'Total amount in dollars',
    'Numbers only',
  ],
  quantity: [
    'e.g. 3',
    'How many items?',
    'Enter a whole number',
  ],
  url: [
    'https://example.com',
    'Project or company website',
    'Paste a valid URL',
  ],
  search: [
    'Type to search…',
    'What are you looking for?',
    'Enter search terms',
  ],
  generic: [
    'Enter a value…',
    'Type here…',
    'Add some text…',
    'Start typing…',
    'Write something…',
  ],
}

const GENERIC_FALLBACK_PLACEHOLDERS: string[] = [
  'Enter value…',
  'Type here…',
  'Start typing…',
  'Add some text…',
  'Write something…',
  'Fill this in…',
]

export type TextInputConfig = {
  flavor: TextInputFlavor
  label: string
  placeholder: string
}

/**
 * Returns a random combination of label + placeholder
 * for a vaguely realistic text input flavor.
 */
export function getRandomTextInputConfig(): TextInputConfig {
  const flavors = Object.keys(TEXT_INPUT_LABELS) as TextInputFlavor[]
  const flavor = randomPick(flavors)

  const labels = TEXT_INPUT_LABELS[flavor]
  const label = randomPick(labels)

  const placeholdersForFlavor =
    TEXT_INPUT_PLACEHOLDERS[flavor] ?? TEXT_INPUT_PLACEHOLDERS.generic

  const placeholder = randomPick(
    placeholdersForFlavor ?? GENERIC_FALLBACK_PLACEHOLDERS,
  )

  return { flavor, label, placeholder }
}

/**
 * Convenience helpers if you only care about one field.
 */
export function getRandomTextInputLabel(): string {
  return getRandomTextInputConfig().label
}

export function getRandomTextInputPlaceholder(): string {
  return getRandomTextInputConfig().placeholder
}
