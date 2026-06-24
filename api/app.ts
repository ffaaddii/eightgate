/**
 * This is a API server
 */

import express from 'express'
import type { Request, Response } from 'express'
import type {} from './types/express.d.ts'
import cors from 'cors'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import path from 'path'
import multer from 'multer'
import authRoutes from './routes/auth.js'
import usersRoutes from './routes/users.js'
import hscodesRoutes from './routes/hscodes.js'
import auditRoutes from './routes/audit.js'

// load env
dotenv.config()

const app = express()

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  }),
)
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')))

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/hscodes', hscodesRoutes)
app.use('/api/audit', auditRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response) => {
  const errObj = error as unknown as { code?: unknown; message?: unknown }
  if (process.env.NODE_ENV !== 'production') {
    const code = typeof errObj.code === 'string' ? errObj.code : 'UNKNOWN'
    const message = typeof errObj.message === 'string' ? errObj.message : ''
    console.error(`[api:error] code=${code} message=${message}`)
  }

  const visited = new Set<unknown>()

  const collectCodes = (err: unknown): string[] => {
    if (!err || visited.has(err)) return []
    visited.add(err)

    const out: string[] = []
    const obj = err as unknown as {
      code?: unknown
      message?: unknown
      cause?: unknown
      errors?: unknown
    }

    if (typeof obj.code === 'string') out.push(obj.code)
    if (typeof obj.message === 'string') {
      if (obj.message.includes('ECONNREFUSED')) out.push('ECONNREFUSED')
      if (obj.message.includes('ETIMEDOUT')) out.push('ETIMEDOUT')
    }

    if (Array.isArray(obj.errors)) {
      for (const e of obj.errors) out.push(...collectCodes(e))
    }

    if (obj.cause) out.push(...collectCodes(obj.cause))
    return out
  }

  const codes = collectCodes(error)
  const has = (c: string) => codes.includes(c)

  if (has('ECONNREFUSED') || has('ETIMEDOUT') || has('PROTOCOL_CONNECTION_LOST')) {
    res.status(503).json({ success: false, error: 'DB_UNAVAILABLE' })
    return
  }

  if (has('ER_NO_SUCH_TABLE') || has('ER_BAD_DB_ERROR')) {
    res.status(500).json({ success: false, error: 'DB_NOT_INITIALIZED' })
    return
  }

  if (has('ER_ACCESS_DENIED_ERROR')) {
    res.status(500).json({ success: false, error: 'DB_AUTH_FAILED' })
    return
  }

  if (error instanceof multer.MulterError) {
    const multerError = error as multer.MulterError
    if (multerError.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ success: false, error: 'FILE_TOO_LARGE' })
      return
    }
    res.status(400).json({ success: false, error: multerError.code })
    return
  }

  if (error.message === 'INVALID_CLASSIFICATION_NOTE_TYPE') {
    res.status(400).json({ success: false, error: 'INVALID_CLASSIFICATION_NOTE_TYPE' })
    return
  }

  if (error.message === 'INVALID_PRODUCT_IMAGE_TYPE') {
    res.status(400).json({ success: false, error: 'INVALID_PRODUCT_IMAGE_TYPE' })
    return
  }

  if (error.message === 'INVALID_EXCEL_TYPE') {
    res.status(400).json({ success: false, error: 'INVALID_EXCEL_TYPE' })
    return
  }

  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
