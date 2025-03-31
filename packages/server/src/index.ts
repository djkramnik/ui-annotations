import dotenv = require('dotenv')
import knex from 'knex'
import path from 'path'
dotenv.config({ path: path.join(__dirname, '.env') })

;(async function main() {
  console.log(process.env.DATABASE_PASSWORD)
  const db = knex({
    client: 'pg',
    connection: {
      host: '127.0.0.1',
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_DB
    }
  })

  try {
    const resp = await db.raw('SELECT count(*) FROM annotations')
    console.log('result:', resp?.rows?.[0])
  } catch(err) {
    console.error(err)
  } finally {
    db.destroy()
  }
})()