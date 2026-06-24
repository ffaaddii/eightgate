import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { getDbEnv } from './env.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main(): Promise<void> {
  const env = getDbEnv()
  const schemaPath = path.join(__dirname, 'schema.mysql.sql')
  const schemaSql = await fs.readFile(schemaPath, 'utf8')

  const bootstrapConn = await mysql.createConnection({
    host: env.host,
    port: env.port,
    user: env.user,
    password: env.password,
    multipleStatements: true,
  })

  await bootstrapConn.query(`CREATE DATABASE IF NOT EXISTS \`${env.database}\``)
  await bootstrapConn.end()

  const conn = await mysql.createConnection({
    ...env,
    multipleStatements: true,
  })

  await conn.query(schemaSql)
  await ensureHscodeColumns(conn, env.database)

  const seedUsername = process.env.SEED_SUPERADMIN_USERNAME ?? 'superadmin'
  const seedDisplayName = process.env.SEED_SUPERADMIN_DISPLAY_NAME ?? 'Super Admin'
  const seedPassword = process.env.SEED_SUPERADMIN_PASSWORD ?? 'Admin@1234'

  const [existing] = await conn.query<mysql.RowDataPacket[]>(
    'SELECT id FROM users WHERE username = ? LIMIT 1',
    [seedUsername],
  )

  if (existing.length === 0) {
    const id = randomUUID()
    const password_hash = await bcrypt.hash(seedPassword, 12)
    await conn.query(
      'INSERT INTO users (id, username, display_name, password_hash, role, enabled) VALUES (?, ?, ?, ?, ?, ?)',
      [id, seedUsername, seedDisplayName, password_hash, 'superadmin', 1],
    )
  }

  await conn.end()
}

async function ensureHscodeColumns(
  conn: mysql.Connection,
  database: string,
): Promise<void> {
  const requiredColumns = [
    {
      name: 'full_import_fee',
      definition: 'DECIMAL(12,2) NULL AFTER notes',
    },
    {
      name: 'consumption_spending_fee',
      definition: 'DECIMAL(12,2) NULL AFTER full_import_fee',
    },
    {
      name: 'tax_advance',
      definition: 'DECIMAL(12,2) NULL AFTER consumption_spending_fee',
    },
    {
      name: 'unit_type',
      definition: 'VARCHAR(64) NULL AFTER tax_advance',
    },
    {
      name: 'classification_note_name',
      definition: 'VARCHAR(255) NULL AFTER unit_type',
    },
    {
      name: 'classification_note_path',
      definition: 'VARCHAR(500) NULL AFTER classification_note_name',
    },
    {
      name: 'product_image_name',
      definition: 'VARCHAR(255) NULL AFTER classification_note_path',
    },
    {
      name: 'product_image_path',
      definition: 'VARCHAR(500) NULL AFTER product_image_name',
    },
  ] as const

  for (const column of requiredColumns) {
    const [rows] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT 1
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME = 'hscodes'
         AND COLUMN_NAME = ?
       LIMIT 1`,
      [database, column.name],
    )

    if (rows.length === 0) {
      await conn.query(`ALTER TABLE hscodes ADD COLUMN ${column.name} ${column.definition}`)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
