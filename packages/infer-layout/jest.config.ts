import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // pick up .test.ts / .spec.ts anywhere under src/ or tests/
  testMatch: ['**/?(*.)+(test|spec).ts'],
  // optional: turn on TS diagnostics in test output
  globals: { 'ts-jest': { diagnostics: true } },
}
export default config