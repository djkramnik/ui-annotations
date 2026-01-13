import { z } from 'zod'
import { ApplyTransformations, ProcessScreenshot } from '.'

export const extractNamedArgs = (): Record<string, string> | null => {
  const args = process.argv.slice(2)
  let dict: Record<string, string> | null = null
  for(const arg of args) {
    if (!arg.startsWith('--')) {
      console.log('unparseable arg', arg)
      continue
    }
    const [name, value] = arg.split('=')
    if (!dict) {
      dict = {}
    }
    dict[name.slice(2)] = value
  }
  return dict
}

export const configName = z.enum(['interactive', 'text', 'synth'])
export type ConfigName = z.infer<typeof configName>

export const scraperArgs = z.object({
  processor: configName,
  transform: configName,
  links: configName,
  debug: z.string().optional(),
  max_scroll: z.string().optional()
})

export type ScraperConfig = {
  processScreen: ProcessScreenshot
  transform: ApplyTransformations
  fetchLinks: () => Promise<string[]>
  maxScrollIndex?: number
  maxLinks?: number
  debug?: boolean
}