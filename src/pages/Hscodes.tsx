import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Plus } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Tag } from '@/components/ui/Tag'
import { Modal } from '@/components/ui/Modal'
import { ApiError, apiGet, apiPatchForm, apiPostForm } from '@/utils/api'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useAuthStore } from '@/stores/authStore'

type HsStatus = 'pending_review' | 'approved' | 'rejected'

type HsRow = {
  id: string
  code: string
  description: string
  notes: string | null
  fullImportFee: number | null
  consumptionSpendingFee: number | null
  taxAdvance: number | null
  unitType: string | null
  classificationNoteName: string | null
  classificationNotePath: string | null
  productImageName: string | null
  productImagePath: string | null
  status: HsStatus
  createdBy: string
  auditedBy: string | null
  auditedAt: string | null
  rejectionReason: string | null
  createdAt: string
  updatedAt: string
}

function statusTone(s: HsStatus) {
  if (s === 'approved') return 'success'
  if (s === 'pending_review') return 'warn'
  return 'danger'
}

export default function Hscodes() {
  const me = useAuthStore((s) => s.me)
  const canWrite = me?.role === 'publisher' || me?.role === 'superadmin'
  const isSuperadmin = me?.role === 'superadmin'
  const canFilterStatus = me?.role === 'publisher' || me?.role === 'auditor' || me?.role === 'superadmin'

  const [q, setQ] = useState('')
  const dq = useDebouncedValue(q, 350)
  const [status, setStatus] = useState<string>('')
  const [rows, setRows] = useState<HsRow[]>([])
  const [loading, setLoading] = useState(false)

  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<HsRow | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [details, setDetails] = useState<HsRow | null>(null)
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [fullImportFee, setFullImportFee] = useState('')
  const [consumptionSpendingFee, setConsumptionSpendingFee] = useState('')
  const [taxAdvance, setTaxAdvance] = useState('')
  const [unitType, setUnitType] = useState('')
  const [classificationNoteFile, setClassificationNoteFile] = useState<File | null>(null)
  const [productImageFile, setProductImageFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [importing, setImporting] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  async function refresh() {
    setLoading(true)
    try {
      const res = await apiGet<{ success: true; data: HsRow[] }>(queryUrl)
      setRows(res.data)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setCode('')
    setDescription('')
    setNotes('')
    setFullImportFee('')
    setConsumptionSpendingFee('')
    setTaxAdvance('')
    setUnitType('')
    setClassificationNoteFile(null)
    setProductImageFile(null)
  }

  function buildFormData() {
    const form = new FormData()
    form.set('code', code.trim())
    form.set('description', description.trim())
    form.set('notes', notes.trim())
    form.set('fullImportFee', fullImportFee.trim())
    form.set('consumptionSpendingFee', consumptionSpendingFee.trim())
    form.set('taxAdvance', taxAdvance.trim())
    form.set('unitType', unitType.trim())
    if (classificationNoteFile) form.set('classificationNote', classificationNoteFile)
    if (productImageFile) form.set('productImage', productImageFile)
    return form
  }

  const queryUrl = useMemo(() => {
    const usp = new URLSearchParams()
    if (dq.trim().length > 0) usp.set('q', dq.trim())
    if (canFilterStatus && status) usp.set('status', status)
    return `/api/hscodes?${usp.toString()}`
  }, [dq, canFilterStatus, status])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await apiGet<{ success: true; data: HsRow[] }>(queryUrl)
        if (!cancelled) setRows(res.data)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [queryUrl])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">قائمة HSCODE</div>
          <div className="text-xs text-[rgb(var(--muted))]">البحث يُرسل بعد توقف الكتابة (Debounce)</div>
        </div>

        {canWrite && (
          <div className="flex flex-wrap items-center gap-2">
            {isSuperadmin && (
              <>
                <input
                  ref={importInputRef}
                  className="hidden"
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={async (e) => {
                    const file = e.target.files?.[0] ?? null
                    e.target.value = ''
                    if (!file) return
                    setImportMessage(null)
                    setImporting(true)
                    try {
                      const form = new FormData()
                      form.set('file', file)
                      const res = await apiPostForm<{ success: true; data: { inserted: number; updated: number; total: number } }>(
                        '/api/hscodes/import.xlsx',
                        form,
                      )
                      setImportMessage(`تم الاستيراد: إضافة ${res.data.inserted} وتحديث ${res.data.updated} (الإجمالي ${res.data.total})`)
                      await refresh()
                    } catch (err) {
                      if (err instanceof ApiError) setImportMessage(`فشل الاستيراد: ${err.message}`)
                      else setImportMessage('فشل الاستيراد')
                    } finally {
                      setImporting(false)
                    }
                  }}
                />

                <Button
                  variant="secondary"
                  disabled={importing}
                  onClick={() => importInputRef.current?.click()}
                >
                  استيراد Excel
                </Button>

                <Button
                  variant="secondary"
                  disabled={exporting}
                  onClick={async () => {
                    setImportMessage(null)
                    setExporting(true)
                    try {
                      const res = await fetch('/api/hscodes/export.xlsx', { credentials: 'include' })
                      if (!res.ok) throw new ApiError({ status: res.status, message: res.statusText, payload: null })
                      const blob = await res.blob()
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = 'hscodes.xlsx'
                      document.body.appendChild(a)
                      a.click()
                      a.remove()
                      URL.revokeObjectURL(url)
                    } catch (err) {
                      if (err instanceof ApiError) setImportMessage(`فشل التصدير: ${err.message}`)
                      else setImportMessage('فشل التصدير')
                    } finally {
                      setExporting(false)
                    }
                  }}
                >
                  تصدير Excel
                </Button>
              </>
            )}

            <Button
              onClick={() => {
                setEdit(null)
                resetForm()
                setOpen(true)
              }}
            >
              <Plus className="h-4 w-4" />
              إضافة
            </Button>
          </div>
        )}
      </div>

      {importMessage && (
        <Card className="p-3 text-sm">
          {importMessage}
        </Card>
      )}

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-[rgb(var(--muted))]" />
            <Input
              className="pr-9"
              placeholder="ابحث بالرمز أو الوصف أو الملاحظات"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {canFilterStatus && (
            <select
              className="h-9 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm text-[rgb(var(--fg))] outline-none focus:border-[rgb(var(--primary))]"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">كل الحالات</option>
              <option value="approved">معتمد</option>
              <option value="pending_review">بانتظار التدقيق</option>
              <option value="rejected">مرفوض</option>
            </select>
          )}
        </div>
      </Card>

      <Card className="hidden overflow-hidden md:block">
        <div className="max-h-[65vh] overflow-auto">
          <table className="w-full border-collapse text-right text-sm">
            <thead className="sticky top-0 bg-[rgb(var(--surface))]">
              <tr className="border-b border-[rgb(var(--border))] text-xs text-[rgb(var(--muted))]">
                <th className="px-4 py-3">الرمز</th>
                <th className="px-4 py-3">الوصف</th>
                <th className="px-4 py-3">نوع الوحدة</th>
                <th className="px-4 py-3">رسم الاستيراد الكامل</th>
                <th className="px-4 py-3">رسم الإنفاق الاستهلاكي</th>
                <th className="px-4 py-3">السلفة الضريبية</th>
                <th className="hidden px-4 py-3 lg:table-cell">مذكرة التصنيف</th>
                <th className="hidden px-4 py-3 lg:table-cell">صورة المنتج</th>
                <th className="px-4 py-3">الحالة</th>
                <th className="px-4 py-3">آخر تحديث</th>
                {canWrite && <th className="px-4 py-3">إجراء</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-center text-[rgb(var(--muted))]" colSpan={canWrite ? 11 : 10}>
                    جارٍ التحميل...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-[rgb(var(--muted))]" colSpan={canWrite ? 11 : 10}>
                    لا توجد نتائج
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    className="cursor-pointer border-b border-[rgb(var(--border))] hover:bg-[rgb(var(--surface-2))]"
                    onClick={() => {
                      setDetails(r)
                      setDetailsOpen(true)
                    }}
                  >
                    <td className="px-4 py-3 font-medium">{r.code}</td>
                    <td className="px-4 py-3">
                      <div className="line-clamp-2">{r.description}</div>
                      {r.rejectionReason && (
                        <div className="mt-1 text-xs text-red-600">سبب الرفض: {r.rejectionReason}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">{r.unitType ?? '-'}</td>
                    <td className="px-4 py-3 text-xs">
                      {r.fullImportFee === null ? '-' : String(r.fullImportFee)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {r.consumptionSpendingFee === null ? '-' : String(r.consumptionSpendingFee)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {r.taxAdvance === null ? '-' : String(r.taxAdvance)}
                    </td>
                    <td className="hidden px-4 py-3 text-xs lg:table-cell">
                      {r.classificationNotePath ? (
                        <a
                          className="text-blue-600 underline"
                          href={r.classificationNotePath}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {r.classificationNoteName ?? 'فتح الملف'}
                        </a>
                      ) : (
                        <span className="text-[rgb(var(--muted))]">لا يوجد</span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      {r.productImagePath ? (
                        <a href={r.productImagePath} target="_blank" rel="noreferrer">
                          <img
                            alt={r.productImageName ?? r.code}
                            className="h-14 w-14 rounded-lg object-cover ring-1 ring-[rgb(var(--border))]"
                            src={r.productImagePath}
                          />
                        </a>
                      ) : (
                        <span className="text-xs text-[rgb(var(--muted))]">لا يوجد</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Tag tone={statusTone(r.status)}>{r.status}</Tag>
                    </td>
                    <td className="px-4 py-3 text-xs text-[rgb(var(--muted))]">{String(r.updatedAt)}</td>
                    {canWrite && (
                      <td className="px-4 py-3">
                        <Button
                          variant="secondary"
                          disabled={me?.role !== 'superadmin' && r.status === 'approved'}
                          onClick={(e) => {
                            e.stopPropagation()
                            setEdit(r)
                            setCode(r.code)
                            setDescription(r.description)
                            setNotes(r.notes ?? '')
                            setFullImportFee(r.fullImportFee === null ? '' : String(r.fullImportFee))
                            setConsumptionSpendingFee(r.consumptionSpendingFee === null ? '' : String(r.consumptionSpendingFee))
                            setTaxAdvance(r.taxAdvance === null ? '' : String(r.taxAdvance))
                            setUnitType(r.unitType ?? '')
                            setClassificationNoteFile(null)
                            setProductImageFile(null)
                            setOpen(true)
                          }}
                        >
                          تعديل
                        </Button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-3 md:hidden">
        {loading ? (
          <Card className="p-4 text-sm text-[rgb(var(--muted))]">جارٍ التحميل...</Card>
        ) : rows.length === 0 ? (
          <Card className="p-4 text-sm text-[rgb(var(--muted))]">لا توجد نتائج</Card>
        ) : (
          rows.map((r) => (
            <Card
              key={r.id}
              className="cursor-pointer p-4 hover:bg-[rgb(var(--surface-2))]"
              onClick={() => {
                setDetails(r)
                setDetailsOpen(true)
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{r.code}</div>
                  <div className="mt-1 line-clamp-2 text-xs text-[rgb(var(--muted))]">{r.description}</div>
                </div>
                <Tag tone={statusTone(r.status)}>{r.status}</Tag>
              </div>

              <div className="mt-3 grid gap-1 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[rgb(var(--muted))]">نوع الوحدة</span>
                  <span className="truncate">{r.unitType ?? '-'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[rgb(var(--muted))]">رسم الاستيراد الكامل</span>
                  <span>{r.fullImportFee === null ? '-' : String(r.fullImportFee)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[rgb(var(--muted))]">رسم الإنفاق الاستهلاكي</span>
                  <span>{r.consumptionSpendingFee === null ? '-' : String(r.consumptionSpendingFee)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[rgb(var(--muted))]">السلفة الضريبية</span>
                  <span>{r.taxAdvance === null ? '-' : String(r.taxAdvance)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[rgb(var(--muted))]">آخر تحديث</span>
                  <span className="truncate">{String(r.updatedAt)}</span>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal
        open={open}
        title={edit ? 'تعديل سجل HSCODE' : 'إضافة سجل HSCODE'}
        onClose={() => setOpen(false)}
      >
        <div className="grid gap-3">
          <div>
            <div className="mb-1 text-xs text-[rgb(var(--muted))]">الرمز</div>
            <Input value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div>
            <div className="mb-1 text-xs text-[rgb(var(--muted))]">الوصف</div>
            <textarea
              className="min-h-24 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm text-[rgb(var(--fg))] outline-none placeholder:text-[rgb(var(--muted))] focus:border-[rgb(var(--primary))]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <div className="mb-1 text-xs text-[rgb(var(--muted))]">ملاحظات (اختياري)</div>
            <textarea
              className="min-h-20 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm text-[rgb(var(--fg))] outline-none placeholder:text-[rgb(var(--muted))] focus:border-[rgb(var(--primary))]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="mb-1 text-xs text-[rgb(var(--muted))]">نوع الوحدة (اختياري)</div>
              <Input value={unitType} onChange={(e) => setUnitType(e.target.value)} />
            </div>
            <div>
              <div className="mb-1 text-xs text-[rgb(var(--muted))]">رسم الاستيراد الكامل (اختياري)</div>
              <Input
                inputMode="decimal"
                type="number"
                step="0.01"
                value={fullImportFee}
                onChange={(e) => setFullImportFee(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="mb-1 text-xs text-[rgb(var(--muted))]">رسم الإنفاق الاستهلاكي (اختياري)</div>
              <Input
                inputMode="decimal"
                type="number"
                step="0.01"
                value={consumptionSpendingFee}
                onChange={(e) => setConsumptionSpendingFee(e.target.value)}
              />
            </div>
            <div>
              <div className="mb-1 text-xs text-[rgb(var(--muted))]">السلفة الضريبية (اختياري)</div>
              <Input
                inputMode="decimal"
                type="number"
                step="0.01"
                value={taxAdvance}
                onChange={(e) => setTaxAdvance(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="mb-1 text-xs text-[rgb(var(--muted))]">مذكرة التصنيف (PDF أو صورة)</div>
              <Input
                accept=".pdf,image/*"
                type="file"
                onChange={(e) => setClassificationNoteFile(e.target.files?.[0] ?? null)}
              />
              <div className="mt-1 text-xs text-[rgb(var(--muted))]">
                {classificationNoteFile?.name
                  ?? edit?.classificationNoteName
                  ?? 'يمكنك رفع ملف جديد أو ترك الحقل كما هو'}
              </div>
              {edit?.classificationNotePath && !classificationNoteFile && (
                <a
                  className="mt-1 inline-block text-xs text-blue-600 underline"
                  href={edit.classificationNotePath}
                  target="_blank"
                  rel="noreferrer"
                >
                  فتح المذكرة الحالية
                </a>
              )}
            </div>
            <div>
              <div className="mb-1 text-xs text-[rgb(var(--muted))]">صورة المنتج</div>
              <Input
                accept="image/*"
                type="file"
                onChange={(e) => setProductImageFile(e.target.files?.[0] ?? null)}
              />
              <div className="mt-1 text-xs text-[rgb(var(--muted))]">
                {productImageFile?.name
                  ?? edit?.productImageName
                  ?? 'يمكنك رفع صورة جديدة أو ترك الحقل كما هو'}
              </div>
              {edit?.productImagePath && !productImageFile && (
                <a href={edit.productImagePath} target="_blank" rel="noreferrer">
                  <img
                    alt={edit.productImageName ?? edit.code}
                    className="mt-2 h-20 w-20 rounded-lg object-cover ring-1 ring-[rgb(var(--border))]"
                    src={edit.productImagePath}
                  />
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              disabled={saving || code.trim().length === 0 || description.trim().length === 0}
              onClick={async () => {
                setSaving(true)
                try {
                  if (edit) {
                    await apiPatchForm(`/api/hscodes/${edit.id}`, buildFormData())
                  } else {
                    await apiPostForm('/api/hscodes', buildFormData())
                  }
                  setOpen(false)
                  resetForm()
                  await refresh()
                } finally {
                  setSaving(false)
                }
              }}
            >
              حفظ وإرسال للتدقيق
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={detailsOpen && !!details}
        title="تفاصيل HSCODE"
        onClose={() => {
          setDetailsOpen(false)
          setDetails(null)
        }}
      >
        {details && (
          <div className="grid gap-4">
            <div className="grid gap-2 text-sm">
              <div className="grid gap-1">
                <div className="text-xs text-[rgb(var(--muted))]">الرمز</div>
                <div className="font-semibold">{details.code}</div>
              </div>

              <div className="grid gap-1">
                <div className="text-xs text-[rgb(var(--muted))]">الوصف</div>
                <div className="whitespace-pre-wrap">{details.description}</div>
              </div>

              {details.notes && (
                <div className="grid gap-1">
                  <div className="text-xs text-[rgb(var(--muted))]">ملاحظات</div>
                  <div className="whitespace-pre-wrap">{details.notes}</div>
                </div>
              )}
            </div>

            <div className="grid gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[rgb(var(--muted))]">نوع الوحدة</span>
                <span className="truncate">{details.unitType ?? '-'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[rgb(var(--muted))]">رسم الاستيراد الكامل</span>
                <span>{details.fullImportFee === null ? '-' : String(details.fullImportFee)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[rgb(var(--muted))]">رسم الإنفاق الاستهلاكي</span>
                <span>{details.consumptionSpendingFee === null ? '-' : String(details.consumptionSpendingFee)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[rgb(var(--muted))]">السلفة الضريبية</span>
                <span>{details.taxAdvance === null ? '-' : String(details.taxAdvance)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[rgb(var(--muted))]">الحالة</span>
                <Tag tone={statusTone(details.status)}>{details.status}</Tag>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[rgb(var(--muted))]">تاريخ الإنشاء</span>
                <span className="truncate">{String(details.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[rgb(var(--muted))]">آخر تحديث</span>
                <span className="truncate">{String(details.updatedAt)}</span>
              </div>
            </div>

            {(details.classificationNotePath || details.productImagePath) && (
              <div className="grid gap-3">
                <div className="text-sm font-semibold">المرفقات</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3 text-sm">
                    <div className="mb-2 text-xs text-[rgb(var(--muted))]">مذكرة التصنيف</div>
                    {details.classificationNotePath ? (
                      <a
                        className="text-blue-600 underline"
                        href={details.classificationNotePath}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {details.classificationNoteName ?? 'فتح الملف'}
                      </a>
                    ) : (
                      <div className="text-[rgb(var(--muted))]">لا يوجد</div>
                    )}
                  </div>

                  <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3 text-sm">
                    <div className="mb-2 text-xs text-[rgb(var(--muted))]">صورة المنتج</div>
                    {details.productImagePath ? (
                      <a href={details.productImagePath} target="_blank" rel="noreferrer">
                        <img
                          alt={details.productImageName ?? details.code}
                          className="h-28 w-28 rounded-lg object-cover ring-1 ring-[rgb(var(--border))]"
                          src={details.productImagePath}
                        />
                      </a>
                    ) : (
                      <div className="text-[rgb(var(--muted))]">لا يوجد</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {(details.auditedBy || details.auditedAt || details.rejectionReason) && (
              <div className="grid gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3 text-sm">
                <div className="text-sm font-semibold">التدقيق</div>
                <div className="grid gap-1 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[rgb(var(--muted))]">مدقق بواسطة</span>
                    <span className="truncate">{details.auditedBy ?? '-'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[rgb(var(--muted))]">وقت التدقيق</span>
                    <span className="truncate">{details.auditedAt ?? '-'}</span>
                  </div>
                  {details.rejectionReason && (
                    <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-red-700">
                      سبب الرفض: {details.rejectionReason}
                    </div>
                  )}
                </div>
              </div>
            )}

            {canWrite && (
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="secondary"
                  disabled={me?.role !== 'superadmin' && details.status === 'approved'}
                  onClick={() => {
                    setDetailsOpen(false)
                    setDetails(null)
                    setEdit(details)
                    setCode(details.code)
                    setDescription(details.description)
                    setNotes(details.notes ?? '')
                    setFullImportFee(details.fullImportFee === null ? '' : String(details.fullImportFee))
                    setConsumptionSpendingFee(details.consumptionSpendingFee === null ? '' : String(details.consumptionSpendingFee))
                    setTaxAdvance(details.taxAdvance === null ? '' : String(details.taxAdvance))
                    setUnitType(details.unitType ?? '')
                    setClassificationNoteFile(null)
                    setProductImageFile(null)
                    setOpen(true)
                  }}
                >
                  تعديل
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
