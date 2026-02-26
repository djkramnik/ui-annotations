import { PrismaClient } from "annotation_schema"

let prisma: PrismaClient | null = null

export const getDbClient = () => {
  if (!prisma) {
    prisma = new PrismaClient()
  }
  return prisma
}