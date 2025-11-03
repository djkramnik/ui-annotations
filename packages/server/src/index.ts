import dotenv = require('dotenv')
import path from 'path'
import express from 'express'
import { screenshotRouter } from './routes/screenshot'
import { utilRouter } from './routes/util'
import { prisma } from './db'
import { ocrRouter } from './routes/ocr'
import { interactiveRouter } from './routes/interactive'
import { annotationRouter } from './routes/annotation'

dotenv.config({ path: path.join(__dirname, '.env') })

;(async function main() {

  try {
    // if we are here, we are connected to db
    const app = express()
    const port = process.env.PORT || 4000

    app.use(express.json({ limit: '10mb' }))
    app.use('/api/annotation', annotationRouter)
    app.use('/api/screenshot', screenshotRouter)
    app.use('/api/util', utilRouter)
    app.use('/api/ocr', ocrRouter)
    app.use('/api/interactive', interactiveRouter)

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