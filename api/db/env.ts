import dotenv from 'dotenv'

dotenv.config()

export type DbEnv = {
  host: string
  port: number
  user: string
  password: string
  database: string
}

function readEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var: ${name}`)
  return v
}

export function getDbEnv(): DbEnv {
  const portRaw = process.env.DB_PORT ?? '3306'
  const port = Number(portRaw)
  if (!Number.isFinite(port)) throw new Error('Invalid DB_PORT')

  return {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port,
    user: readEnv('DB_USER'),
    password: process.env.DB_PASSWORD ?? '',
    database: readEnv('DB_NAME'),
  }
}

export function getJwtSecret(): string {
  return readEnv('AUTH_JWT_SECRET')
}
