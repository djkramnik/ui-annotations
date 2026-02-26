import { PrismaClient } from 'annotation_schema'

export const prisma = new PrismaClient({
  transactionOptions: {
    timeout: 10000,
  }
})