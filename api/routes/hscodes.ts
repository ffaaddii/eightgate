import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { Router } from 'express'
import type { Request, Response } from 'express-serve-static-core'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import multer from 'multer'
import * as XLSX from 'xlsx'
import { db } from '../db/pool.js'
import { requireAuth, requirePermission } from '../auth/middleware.js'
import { writeAudit } from '../audit/write.js'
import { asyncHandler } from '../http/asyncHandler.js'

type HsStatus = 'pending_review' | 'approved' | 'rejected'

type HsRow = RowDataPacket & {
  id: string
  code: string
  description: string
  notes: string | null
  full_import_fee: string | number | null
  consumption_spending_fee: string | number | null
  tax_advance: string | number | null
  unit_type: string | null
  classification_note_name: string | null
  classification_note_path: string | null
  product_image_name: string | null
  product_image_path: string | null
  status: HsStatus
  created_by: string
  updated_by: string
  audited_by: string | null
  audited_at: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
}

type HsExistingRow = RowDataPacket & {
  id: string
  status: HsStatus
  created_by: string
  classification_note_path: string | null
  product_image_path: string | null
}

const router = Router()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '../..')
const hsUploadsDir = path.join(projectRoot, 'uploads', 'hscodes')
const publicUploadBase = '/uploads/hscodes'

const classificationNoteMimeTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

const productImageMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 2,
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === 'classificationNote') {
      if (classificationNoteMimeTypes.has(file.mimetype)) cb(null, true)
      else cb(new Error('INVALID_CLASSIFICATION_NOTE_TYPE'))
      return
    }

    if (file.fieldname === 'productImage') {
      if (productImageMimeTypes.has(file.mimetype)) cb(null, true)
      else cb(new Error('INVALID_PRODUCT_IMAGE_TYPE'))
      return
    }

    cb(null, false)
  },
})

const hscodeUploadMiddleware = upload.fields([
  { name: 'classificationNote', maxCount: 1 },
  { name: 'productImage', maxCount: 1 },
])

const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/octet-stream'
    ;(cb as unknown as (error: Error | null, acceptFile: boolean) => void)(
      ok ? null : new Error('INVALID_EXCEL_TYPE'),
      ok,
    )
  },
})

router.use(requireAuth)
router.use(requirePermission('hscodes:read'))

function normalizeText(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined
  const value = input.trim()
  return value.length > 0 ? value : undefined
}

function maybeNullText(input: unknown): string | null | undefined {
  if (input === undefined) return undefined
  if (typeof input !== 'string') return undefined
  const value = input.trim()
  return value.length > 0 ? value : null
}

function maybeNullNumber(input: unknown): number | null | undefined {
  if (input === undefined) return undefined
  if (typeof input !== 'string') return undefined
  const value = input.trim()
  if (value.length === 0) return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return undefined
  return parsed
}

function maybeNullDecimal(input: unknown): number | null | undefined {
  if (input === undefined) return undefined
  if (input === null) return null
  if (typeof input === 'number') return Number.isFinite(input) ? input : undefined
  if (typeof input !== 'string') return undefined
  const value = input.trim()
  if (value.length === 0) return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return undefined
  return parsed
}

function getUploadedFiles(req: Request): {
  classificationNote?: Express.Multer.File
  productImage?: Express.Multer.File
} {
  const files = (req.files ?? {}) as Record<string, Express.Multer.File[] | undefined>

  return {
    classificationNote: files.classificationNote?.[0],
    productImage: files.productImage?.[0],
  }
}

function getFileExtension(file: Express.Multer.File): string {
  const ext = path.extname(file.originalname).trim().toLowerCase()
  if (ext) return ext
  if (file.mimetype === 'application/pdf') return '.pdf'
  if (file.mimetype === 'image/png') return '.png'
  if (file.mimetype === 'image/webp') return '.webp'
  if (file.mimetype === 'image/gif') return '.gif'
  return '.jpg'
}

async function saveUploadedFile(
  file: Express.Multer.File,
): Promise<{ name: string; path: string }> {
  await fs.mkdir(hsUploadsDir, { recursive: true })
  const storedName = `${randomUUID()}${getFileExtension(file)}`
  await fs.writeFile(path.join(hsUploadsDir, storedName), file.buffer)
  return {
    name: file.originalname,
    path: `${publicUploadBase}/${storedName}`,
  }
}

function getAbsoluteUploadPath(publicPath: string): string | null {
  if (!publicPath.startsWith(`${publicUploadBase}/`)) return null
  return path.join(hsUploadsDir, path.basename(publicPath))
}

async function deleteStoredFile(publicPath: string | null | undefined): Promise<void> {
  if (!publicPath) return
  const absolutePath = getAbsoluteUploadPath(publicPath)
  if (!absolutePath) return

  try {
    await fs.unlink(absolutePath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
  }
}

function mapRow(row: HsRow) {
  return {
    id: String(row.id),
    code: String(row.code),
    description: String(row.description),
    notes: row.notes ? String(row.notes) : null,
    fullImportFee:
      row.full_import_fee === null || row.full_import_fee === undefined
        ? null
        : Number(row.full_import_fee),
    consumptionSpendingFee:
      row.consumption_spending_fee === null || row.consumption_spending_fee === undefined
        ? null
        : Number(row.consumption_spending_fee),
    taxAdvance:
      row.tax_advance === null || row.tax_advance === undefined
        ? null
        : Number(row.tax_advance),
    unitType: row.unit_type ? String(row.unit_type) : null,
    classificationNoteName: row.classification_note_name ? String(row.classification_note_name) : null,
    classificationNotePath: row.classification_note_path ? String(row.classification_note_path) : null,
    productImageName: row.product_image_name ? String(row.product_image_name) : null,
    productImagePath: row.product_image_path ? String(row.product_image_path) : null,
    status: row.status as HsStatus,
    createdBy: String(row.created_by),
    auditedBy: row.audited_by ? String(row.audited_by) : null,
    auditedAt: row.audited_at ?? null,
    rejectionReason: row.rejection_reason ? String(row.rejection_reason) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

router.get('/export.xlsx', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (req.user?.role !== 'superadmin') {
    res.status(403).json({ success: false, error: 'FORBIDDEN' })
    return
  }

  const [rows] = await db.query<HsRow[]>(
    `SELECT id, code, description, notes,
            unit_type,
            full_import_fee, consumption_spending_fee, tax_advance,
            status, created_at, updated_at
     FROM hscodes
     ORDER BY updated_at DESC
     LIMIT 5000`,
  )

  const data = rows.map((r) => ({
    'الرمز': String(r.code),
    'الوصف': String(r.description),
    'ملاحظات': r.notes ? String(r.notes) : '',
    'نوع الوحدة': r.unit_type ? String(r.unit_type) : '',
    'رسم الاستيراد الكامل': r.full_import_fee === null || r.full_import_fee === undefined ? '' : Number(r.full_import_fee),
    'رسم الإنفاق الاستهلاكي': r.consumption_spending_fee === null || r.consumption_spending_fee === undefined ? '' : Number(r.consumption_spending_fee),
    'السلفة الضريبية': r.tax_advance === null || r.tax_advance === undefined ? '' : Number(r.tax_advance),
    'الحالة': String(r.status),
    'تاريخ الإنشاء': String(r.created_at),
    'آخر تحديث': String(r.updated_at),
  }))

  const ws = XLSX.utils.json_to_sheet(data, {
    header: [
      'الرمز',
      'الوصف',
      'ملاحظات',
      'نوع الوحدة',
      'رسم الاستيراد الكامل',
      'رسم الإنفاق الاستهلاكي',
      'السلفة الضريبية',
      'الحالة',
      'تاريخ الإنشاء',
      'آخر تحديث',
    ],
  })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'HSCODES')
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer

  await writeAudit({
    req,
    user: req.user,
    eventType: 'hscodes.export',
    summary: `Exported ${rows.length} hscodes to Excel`,
  })

  res.setHeader(
    'content-type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  res.setHeader('content-disposition', 'attachment; filename="hscodes.xlsx"')
  res.status(200).send(buffer)
}))

router.post('/import.xlsx', requirePermission('hscodes:write'), excelUpload.single('file'), asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (req.user?.role !== 'superadmin') {
    res.status(403).json({ success: false, error: 'FORBIDDEN' })
    return
  }
  const me = req.user
  const file = req.file
  if (!file) {
    res.status(400).json({ success: false, error: 'NO_FILE' })
    return
  }

  const wb = XLSX.read(file.buffer, { type: 'buffer' })
  const sheetName = wb.SheetNames[0]
  const ws = sheetName ? wb.Sheets[sheetName] : undefined
  if (!ws) {
    res.status(400).json({ success: false, error: 'EMPTY_EXCEL' })
    return
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: '',
    raw: true,
  })

  const normalizeHeader = (h: string) => h.trim().toLowerCase()
  const readAny = (obj: Record<string, unknown>, keys: string[]): unknown => {
    for (const k of keys) {
      for (const actualKey of Object.keys(obj)) {
        if (normalizeHeader(actualKey) === normalizeHeader(k)) return obj[actualKey]
      }
    }
    return undefined
  }

  const byCode = new Map<string, {
    code: string
    description: string
    notes: string | null
    unitType: string | null
    fullImportFee: number | null
    consumptionSpendingFee: number | null
    taxAdvance: number | null
  }>()

  for (const r of rows) {
    const codeRaw = readAny(r, ['الرمز', 'code'])
    const descRaw = readAny(r, ['الوصف', 'description'])
    const code = typeof codeRaw === 'string' ? codeRaw.trim() : String(codeRaw ?? '').trim()
    const description = typeof descRaw === 'string' ? descRaw.trim() : String(descRaw ?? '').trim()
    if (!code || !description) continue

    const notes = maybeNullText(readAny(r, ['ملاحظات', 'notes'])) ?? null
    const unitType = maybeNullText(readAny(r, ['نوع الوحدة', 'unitType', 'unit_type'])) ?? null

    const fullImportFee = maybeNullDecimal(readAny(r, ['رسم الاستيراد الكامل', 'fullImportFee', 'full_import_fee'])) ?? null
    const consumptionSpendingFee = maybeNullDecimal(readAny(r, ['رسم الإنفاق الاستهلاكي', 'consumptionSpendingFee', 'consumption_spending_fee'])) ?? null
    const taxAdvance = maybeNullDecimal(readAny(r, ['السلفة الضريبية', 'taxAdvance', 'tax_advance'])) ?? null

    byCode.set(code, {
      code,
      description,
      notes,
      unitType,
      fullImportFee,
      consumptionSpendingFee,
      taxAdvance,
    })
  }

  const uniqueRows = Array.from(byCode.values())
  if (uniqueRows.length === 0) {
    res.status(400).json({ success: false, error: 'NO_VALID_ROWS' })
    return
  }

  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    const codes = uniqueRows.map((r) => r.code)
    const inParams: Record<string, string> = {}
    const inPlaceholders = codes.map((c, i) => {
      const key = `c${i}`
      inParams[key] = c
      return `:${key}`
    }).join(', ')

    const [existingRows] = await conn.query<RowDataPacket[]>(
      `SELECT id, code FROM hscodes WHERE code IN (${inPlaceholders})`,
      inParams,
    )
    const existingByCode = new Map<string, string>()
    for (const er of existingRows) {
      const code = String((er as unknown as { code?: unknown }).code ?? '')
      const id = String((er as unknown as { id?: unknown }).id ?? '')
      if (code && id) existingByCode.set(code, id)
    }

    let inserted = 0
    let updated = 0

    for (const r of uniqueRows) {
      const existingId = existingByCode.get(r.code)
      if (existingId) {
        await conn.query(
          `UPDATE hscodes
           SET description = :description,
               notes = :notes,
               unit_type = :unit_type,
               full_import_fee = :full_import_fee,
               consumption_spending_fee = :consumption_spending_fee,
               tax_advance = :tax_advance,
               status = :status,
               audited_by = :audited_by,
               audited_at = NOW(),
               rejection_reason = NULL,
               updated_by = :updated_by
           WHERE id = :id`,
          {
            id: existingId,
            description: r.description,
            notes: r.notes,
            unit_type: r.unitType,
            full_import_fee: r.fullImportFee,
            consumption_spending_fee: r.consumptionSpendingFee,
            tax_advance: r.taxAdvance,
            status: 'approved',
            audited_by: me.id,
            updated_by: me.id,
          },
        )
        updated++
      } else {
        const id = randomUUID()
        await conn.query(
          `INSERT INTO hscodes (
            id, code, description, notes,
            unit_type,
            full_import_fee, consumption_spending_fee, tax_advance,
            status, created_by, updated_by,
            audited_by, audited_at
          ) VALUES (
            :id, :code, :description, :notes,
            :unit_type,
            :full_import_fee, :consumption_spending_fee, :tax_advance,
            :status, :created_by, :updated_by,
            :audited_by, NOW()
          )`,
          {
            id,
            code: r.code,
            description: r.description,
            notes: r.notes,
            unit_type: r.unitType,
            full_import_fee: r.fullImportFee,
            consumption_spending_fee: r.consumptionSpendingFee,
            tax_advance: r.taxAdvance,
            status: 'approved',
            created_by: me.id,
            updated_by: me.id,
            audited_by: me.id,
          },
        )
        inserted++
      }
    }

    await writeAudit({
      req,
      user: me,
      eventType: 'hscodes.import',
      summary: `Imported hscodes from Excel (inserted=${inserted}, updated=${updated})`,
    })

    await conn.commit()
    res.status(200).json({ success: true, data: { inserted, updated, total: uniqueRows.length } })
  } catch (error) {
    try {
      await conn.rollback()
    } catch {}
    throw error
  } finally {
    conn.release()
  }
}))

router.get('/', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  const statusParam = typeof req.query.status === 'string' ? req.query.status : undefined

  const canSeeNonApproved = req.user?.role === 'superadmin' || req.user?.role === 'auditor'
  const canSeeOwnNonApproved = req.user?.role === 'publisher'

  const filters: string[] = []
  const params: Record<string, string | number> = {}

  if (q.length > 0) {
    filters.push(
      '(code LIKE :q OR description LIKE :q OR notes LIKE :q OR unit_type LIKE :q)',
    )
    params.q = `%${q}%`
  }

  if (statusParam && (canSeeNonApproved || canSeeOwnNonApproved)) {
    filters.push('status = :status')
    params.status = statusParam
  } else if (!canSeeNonApproved && !canSeeOwnNonApproved) {
    filters.push('status = :status')
    params.status = 'approved'
  } else if (canSeeOwnNonApproved) {
    filters.push('(status = :approved OR created_by = :me)')
    params.approved = 'approved'
    params.me = req.user?.id
  }

  const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : ''
  const [rows] = await db.query<HsRow[]>(
    `SELECT id, code, description, notes, full_import_fee, consumption_spending_fee, tax_advance, unit_type,
            classification_note_name, classification_note_path,
            product_image_name, product_image_path,
            status, created_by, updated_by, audited_by, audited_at, rejection_reason, created_at, updated_at
     FROM hscodes
     ${where}
     ORDER BY updated_at DESC
     LIMIT 500`,
    params,
  )

  res.status(200).json({
    success: true,
    data: rows.map(mapRow),
  })
}))

router.post(
  '/',
  requirePermission('hscodes:write'),
  hscodeUploadMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const schema = z.object({
      code: z.string().min(1).max(32),
      description: z.string().min(1).max(4000),
      notes: z.string().max(4000).nullable().optional(),
      fullImportFee: z.number().min(0).nullable().optional(),
      consumptionSpendingFee: z.number().min(0).nullable().optional(),
      taxAdvance: z.number().min(0).nullable().optional(),
      unitType: z.string().max(64).nullable().optional(),
    })

    const parsed = schema.safeParse({
      code: normalizeText(req.body.code),
      description: normalizeText(req.body.description),
      notes: maybeNullText(req.body.notes),
      fullImportFee: maybeNullNumber(req.body.fullImportFee),
      consumptionSpendingFee: maybeNullNumber(req.body.consumptionSpendingFee),
      taxAdvance: maybeNullNumber(req.body.taxAdvance),
      unitType: maybeNullText(req.body.unitType),
    })

    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'INVALID_BODY' })
      return
    }

    const id = randomUUID()
    const me = req.user!
    const { classificationNote, productImage } = getUploadedFiles(req)

    const savedClassificationNote = classificationNote
      ? await saveUploadedFile(classificationNote)
      : null
    const savedProductImage = productImage ? await saveUploadedFile(productImage) : null

    try {
      await db.query(
        `INSERT INTO hscodes (
          id, code, description, notes,
          full_import_fee, consumption_spending_fee, tax_advance, unit_type,
          classification_note_name, classification_note_path,
          product_image_name, product_image_path,
          status, created_by, updated_by
        ) VALUES (
          :id, :code, :description, :notes,
          :full_import_fee, :consumption_spending_fee, :tax_advance, :unit_type,
          :classification_note_name, :classification_note_path,
          :product_image_name, :product_image_path,
          :status, :created_by, :updated_by
        )`,
        {
          id,
          code: parsed.data.code,
          description: parsed.data.description,
          notes: parsed.data.notes ?? null,
          full_import_fee: parsed.data.fullImportFee ?? null,
          consumption_spending_fee: parsed.data.consumptionSpendingFee ?? null,
          tax_advance: parsed.data.taxAdvance ?? null,
          unit_type: parsed.data.unitType ?? null,
          classification_note_name: savedClassificationNote?.name ?? null,
          classification_note_path: savedClassificationNote?.path ?? null,
          product_image_name: savedProductImage?.name ?? null,
          product_image_path: savedProductImage?.path ?? null,
          status: 'pending_review',
          created_by: me.id,
          updated_by: me.id,
        },
      )
    } catch (error) {
      await deleteStoredFile(savedClassificationNote?.path)
      await deleteStoredFile(savedProductImage?.path)
      throw error
    }

    await writeAudit({
      req,
      user: me,
      eventType: 'hscodes.create',
      target: { type: 'hscode', id },
      summary: `Created HS ${parsed.data.code} pending review`,
    })

    res.status(201).json({ success: true, data: { id } })
  }),
)

router.patch(
  '/:id',
  requirePermission('hscodes:write'),
  hscodeUploadMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const schema = z.object({
      code: z.string().min(1).max(32).optional(),
      description: z.string().min(1).max(4000).optional(),
      notes: z.string().max(4000).nullable().optional(),
      fullImportFee: z.number().min(0).nullable().optional(),
      consumptionSpendingFee: z.number().min(0).nullable().optional(),
      taxAdvance: z.number().min(0).nullable().optional(),
      unitType: z.string().max(64).nullable().optional(),
    })

    const parsed = schema.safeParse({
      code: normalizeText(req.body.code),
      description: normalizeText(req.body.description),
      notes: maybeNullText(req.body.notes),
      fullImportFee: maybeNullNumber(req.body.fullImportFee),
      consumptionSpendingFee: maybeNullNumber(req.body.consumptionSpendingFee),
      taxAdvance: maybeNullNumber(req.body.taxAdvance),
      unitType: maybeNullText(req.body.unitType),
    })

    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'INVALID_BODY' })
      return
    }

    const id = req.params.id
    const me = req.user!

    const [existingRows] = await db.query<HsExistingRow[]>(
      `SELECT id, status, created_by, classification_note_path, product_image_path
       FROM hscodes
       WHERE id = :id
       LIMIT 1`,
      { id },
    )
    const existing = existingRows?.[0]
    if (!existing) {
      res.status(404).json({ success: false, error: 'NOT_FOUND' })
      return
    }

    const isOwner = String(existing.created_by) === me.id
    const isAdmin = me.role === 'superadmin'
    if (!isAdmin && !isOwner) {
      res.status(403).json({ success: false, error: 'FORBIDDEN' })
      return
    }

    if (!isAdmin && String(existing.status) === 'approved') {
      res.status(409).json({ success: false, error: 'CANNOT_EDIT_APPROVED' })
      return
    }

    const { classificationNote, productImage } = getUploadedFiles(req)
    const savedClassificationNote = classificationNote
      ? await saveUploadedFile(classificationNote)
      : null
    const savedProductImage = productImage ? await saveUploadedFile(productImage) : null

    const updates: string[] = []
    const params: Record<string, string | number | null> = { id }

    if (typeof parsed.data.code === 'string') {
      updates.push('code = :code')
      params.code = parsed.data.code
    }
    if (typeof parsed.data.description === 'string') {
      updates.push('description = :description')
      params.description = parsed.data.description
    }
    if (parsed.data.notes !== undefined) {
      updates.push('notes = :notes')
      params.notes = parsed.data.notes
    }
    if (parsed.data.fullImportFee !== undefined) {
      updates.push('full_import_fee = :full_import_fee')
      params.full_import_fee = parsed.data.fullImportFee
    }
    if (parsed.data.consumptionSpendingFee !== undefined) {
      updates.push('consumption_spending_fee = :consumption_spending_fee')
      params.consumption_spending_fee = parsed.data.consumptionSpendingFee
    }
    if (parsed.data.taxAdvance !== undefined) {
      updates.push('tax_advance = :tax_advance')
      params.tax_advance = parsed.data.taxAdvance
    }
    if (parsed.data.unitType !== undefined) {
      updates.push('unit_type = :unit_type')
      params.unit_type = parsed.data.unitType
    }
    if (savedClassificationNote) {
      updates.push('classification_note_name = :classification_note_name')
      updates.push('classification_note_path = :classification_note_path')
      params.classification_note_name = savedClassificationNote.name
      params.classification_note_path = savedClassificationNote.path
    }
    if (savedProductImage) {
      updates.push('product_image_name = :product_image_name')
      updates.push('product_image_path = :product_image_path')
      params.product_image_name = savedProductImage.name
      params.product_image_path = savedProductImage.path
    }

    if (updates.length === 0) {
      await deleteStoredFile(savedClassificationNote?.path)
      await deleteStoredFile(savedProductImage?.path)
      res.status(400).json({ success: false, error: 'NO_UPDATES' })
      return
    }

    updates.push('status = :status')
    updates.push('updated_by = :updated_by')
    updates.push('audited_by = NULL')
    updates.push('audited_at = NULL')
    updates.push('rejection_reason = NULL')
    params.status = 'pending_review'
    params.updated_by = me.id

    try {
      await db.query(`UPDATE hscodes SET ${updates.join(', ')} WHERE id = :id`, params)
    } catch (error) {
      await deleteStoredFile(savedClassificationNote?.path)
      await deleteStoredFile(savedProductImage?.path)
      throw error
    }

    await Promise.all([
      savedClassificationNote
        ? deleteStoredFile(existing.classification_note_path)
        : Promise.resolve(),
      savedProductImage ? deleteStoredFile(existing.product_image_path) : Promise.resolve(),
    ])

    await writeAudit({
      req,
      user: me,
      eventType: 'hscodes.update',
      target: { type: 'hscode', id },
      summary: 'Updated and set to pending review',
    })

    res.status(200).json({ success: true })
  }),
)

router.delete('/:id', requirePermission('hscodes:write'), asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (req.user?.role !== 'superadmin') {
    res.status(403).json({ success: false, error: 'FORBIDDEN' })
    return
  }
  const id = req.params.id
  const [existingRows] = await db.query<HsExistingRow[]>(
    `SELECT id, status, created_by, classification_note_path, product_image_path
     FROM hscodes
     WHERE id = :id
     LIMIT 1`,
    { id },
  )
  const existing = existingRows?.[0]
  if (!existing) {
    res.status(404).json({ success: false, error: 'NOT_FOUND' })
    return
  }
  const [result] = await db.query<ResultSetHeader>('DELETE FROM hscodes WHERE id = :id', { id })
  if (!result || result.affectedRows === 0) {
    res.status(404).json({ success: false, error: 'NOT_FOUND' })
    return
  }
  await Promise.all([
    deleteStoredFile(existing.classification_note_path),
    deleteStoredFile(existing.product_image_path),
  ])
  await writeAudit({ req, user: req.user, eventType: 'hscodes.delete', target: { type: 'hscode', id } })
  res.status(200).json({ success: true })
}))

router.post('/:id/approve', requirePermission('hscodes:approve'), asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id
  const me = req.user!
  const [result] = await db.query<ResultSetHeader>(
    'UPDATE hscodes SET status = :status, audited_by = :audited_by, audited_at = NOW(), rejection_reason = NULL, updated_by = :updated_by WHERE id = :id',
    { id, status: 'approved', audited_by: me.id, updated_by: me.id },
  )
  if (!result || result.affectedRows === 0) {
    res.status(404).json({ success: false, error: 'NOT_FOUND' })
    return
  }
  await writeAudit({ req, user: me, eventType: 'hscodes.approve', target: { type: 'hscode', id } })
  res.status(200).json({ success: true })
}))

router.post('/:id/reject', requirePermission('hscodes:approve'), asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const schema = z.object({ reason: z.string().min(1).max(2000) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'INVALID_BODY' })
    return
  }
  const id = req.params.id
  const me = req.user!
  const [result] = await db.query<ResultSetHeader>(
    'UPDATE hscodes SET status = :status, audited_by = :audited_by, audited_at = NOW(), rejection_reason = :rejection_reason, updated_by = :updated_by WHERE id = :id',
    {
      id,
      status: 'rejected',
      audited_by: me.id,
      updated_by: me.id,
      rejection_reason: parsed.data.reason,
    },
  )
  if (!result || result.affectedRows === 0) {
    res.status(404).json({ success: false, error: 'NOT_FOUND' })
    return
  }
  await writeAudit({ req, user: me, eventType: 'hscodes.reject', target: { type: 'hscode', id }, summary: parsed.data.reason })
  res.status(200).json({ success: true })
}))

export default router
