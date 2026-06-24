import type { SessionUser } from '../auth/types.js'

declare module 'express-serve-static-core' {
  interface Request {
    user?: SessionUser
  }
}

export {}

