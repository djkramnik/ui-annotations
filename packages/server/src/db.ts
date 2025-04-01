import knex from 'knex'

let db: knex.Knex<any, unknown[]> | null = null

export const getDb = () => {
  if (db) {
    return db
  }
  db = (
    knex({
      client: 'pg',
      connection: {
        host: '127.0.0.1',
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_DB
      }
    })
  )
  return db
}