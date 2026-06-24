import mysql from 'mysql2/promise'
import { getDbEnv } from './env.js'

export const db = mysql.createPool({
  ...getDbEnv(),
  connectionLimit: 10,
  namedPlaceholders: true,
})

