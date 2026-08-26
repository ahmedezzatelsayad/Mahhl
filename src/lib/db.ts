import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// The sandbox system pre-sets DATABASE_URL to a local SQLite file, which overrides
// whatever we put in .env (process env wins over dotenv in Next.js).
// NEON_DATABASE_URL is our own var the system never touches, so .env wins.
// Priority: NEON_DATABASE_URL (production Neon) -> DATABASE_URL (system/local).
function resolveDatabaseUrl(): string | undefined {
  return (
    process.env.NEON_DATABASE_URL ||
    (process.env.DATABASE_URL?.startsWith('postgresql://') ||
    process.env.DATABASE_URL?.startsWith('postgres://')
      ? process.env.DATABASE_URL
      : undefined)
  )
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query'],
    datasources: resolveDatabaseUrl()
      ? { db: { url: resolveDatabaseUrl() } }
      : undefined,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
