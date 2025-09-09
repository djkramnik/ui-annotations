import * as readline from 'readline'

export interface CliOptions {
  handleInput: (s: string) => any
  inputPrefix?: string
  prompt?: string
}

export interface CliMethods {
  start: (options: CliOptions) => Promise<void>
}

export const getCli = (): CliMethods => {
  const prompt = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  })
  const getInput = (promptText: string): Promise<string> => {
    return new Promise(resolve => {
      prompt.question(promptText, input => {
        resolve(input)
      })
    })
  }
  const start = async ({
    handleInput,
    inputPrefix = '',
    prompt = 'Enter cmd:'
  }: CliOptions) => {
    while(true) {
      const input = await getInput(prompt)
      if ([
        'q',
        'quit',
        'exit'
      ].includes(input.toLowerCase())) {
        break
      }
      await handleInput(`${inputPrefix}${input}`)
    }
  }
  return { start }
}

export const waitForEnter = (): Promise<void> => {
  return new Promise(resolve => {
    process.stdin.once('data', function () {
      resolve()
    })
  })
}