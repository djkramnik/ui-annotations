import dotenv = require('dotenv')
import knex from 'knex'
import path from 'path'
import express from 'express'

dotenv.config({ path: path.join(__dirname, '.env') })

;(async function main() {
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
    await db.raw('SELECT count(*) FROM annotations')
    // if we are here, we are connected to db
    const app = express()
    const port = process.env.PORT || 4000
    if (!process.env.UI_DIR) {
      throw Error('no UI_DIR environment variable')
    }

    app.use(express.static(process.env.UI_DIR))
    app.use(express.json())

    // TODO POST endpoint to save annotation(s) to db
    // TODO: GET endpoint to fetch all annotations for a given url
    // TODO: GET endpoint to fetch all distinct urls for annotations

    app.listen(port, () => {
      console.log('serving listening on port', port)
      console.log('serving static files from ', process.env.UI_DIR)
    })
  } catch(err) {
    console.error(err)
  } finally {
    db.destroy()
  }
})()