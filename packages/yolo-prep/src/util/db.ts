import { PrismaClient } from "@prisma/client"

let prisma: PrismaClient | null = null

export const getDbClient = () => {
  if (!prisma) {
    prisma = new PrismaClient()
  }
  return prisma
}