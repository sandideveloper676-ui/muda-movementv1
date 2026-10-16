import cors from 'cors'
import express from 'express'
import pool from './config/database.js'
import adminRoutes from './routes/adminRoutes.js'
import authRoutes from './routes/authRoutes.js'

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const app = express()

app.disable('x-powered-by')
app.set('trust proxy', 1)
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    const error = new Error('Origin tidak diizinkan.')
    error.status = 403
    return callback(error)
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json({ limit: '10kb' }))

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/config', async (_req, res) => {
  const [rows] = await pool.execute(
    'SELECT setting_value FROM app_settings WHERE setting_key = ? LIMIT 1',
    ['whatsapp_group_url'],
  )
  const whatsappGroupUrl = rows[0]
    ? rows[0].setting_value || null
    : process.env.WHATSAPP_GROUP_URL?.trim() || null
  res.json({ whatsappGroupUrl })
})

app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)

app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint tidak ditemukan.' })
})

app.use((error, _req, res, _next) => {
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600
    ? error.status
    : 500
  if (status === 500) console.error('Kesalahan server:', error)
  res.status(status).json({
    error: status === 500 ? 'Terjadi kesalahan pada server.' : error.message,
  })
})

export default app
