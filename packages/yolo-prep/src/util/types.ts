import { z } from 'zod'

export const configSchema = z.object({
  // annotation crap
  screenTag: z.string().nonempty(),
  labels: z.array(z.string().nonempty()),
  // sagemaker crap
  region: z.string().nonempty(),
  bucket: z.string().nonempty(),
  runName: z.string().nonempty(),
  sagemakerRoleArn: z.string().nonempty(),
  imageUri: z.string().nonempty(),
  // optional
  datasetS3Uri: z.string().nonempty().optional(),
  outputS3Uri: z.string().nonempty().optional(),
})

export type Config = {
  screenTag: string
  labels: string[]
  region: string
  bucket: string
  runName: string
  sagemakerRoleArn: string
  imageUri: string

  datasetS3Uri?: string
  outputS3Uri?: string
}

;({} as Config satisfies z.infer<typeof configSchema>)