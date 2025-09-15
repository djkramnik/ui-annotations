import dotenv = require('dotenv')
import path from 'path'
import express from 'express'
import { annotationRouter } from './routes/annotation'
import { screenshotRouter } from './routes/screenshot'
import { prisma } from './db'

dotenv.config({ path: path.join(__dirname, '.env') })

;(async function main() {

  try {
    // if we are here, we are connected to db
    const app = express()
    const port = process.env.PORT || 4000

    app.use(express.json({ limit: '10mb' }))
    app.use('/api/annotation', annotationRouter)
    app.use('/api/screenshot', screenshotRouter)

    const server = app.listen(port, () => {
      console.log('serving listening on port', port)
    })

    process.on('SIGTERM', shutDown);
    process.on('SIGINT', shutDown);

    function shutDown() {
      server.close(() => {
        prisma.$disconnect()
          .then(() => {
            process.exit(0)
          })
          .catch((e: any) => {
            console.error('could not disconnect prisma', e)
            process.exit(1)
          })
      })
    }
  } catch(err) {
    console.error(err)
  }
})()