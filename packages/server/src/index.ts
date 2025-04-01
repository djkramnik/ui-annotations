import dotenv = require('dotenv')
import path from 'path'
import express from 'express'
import { annotationRouter } from './routes/annotation'
import { getDb } from './db'

dotenv.config({ path: path.join(__dirname, '.env') })

;(async function main() {
  const db = getDb()

  try {
    console.log('test', (await db.raw('SELECT count(*) FROM annotations')).rows[0])
    // if we are here, we are connected to db
    const app = express()
    const port = process.env.PORT || 4000
    if (!process.env.UI_DIR) {
      throw Error('no UI_DIR environment variable')
    }

    app.get('/view/', (req, res) => {
      res.redirect('/');
    });

    app.use(express.static(process.env.UI_DIR))
    app.use(express.json({ limit: '10mb' }))
    app.use('/api/annotation', annotationRouter)

    const server = app.listen(port, () => {
      console.log('serving listening on port', port)
      console.log('serving static files from ', process.env.UI_DIR)
    })

    process.on('SIGTERM', shutDown);
    process.on('SIGINT', shutDown);

    function shutDown() {
      server.close(() => {
        db.destroy().then(() => {
          process.exit(0)
        })
      })
    }
  } catch(err) {
    console.error(err)
  }
})()