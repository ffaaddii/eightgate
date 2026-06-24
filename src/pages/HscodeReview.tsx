import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Tag } from '@/components/ui/Tag'
import { apiGet, apiPost } from '@/utils/api'

type Row = {
  id: string
  code: string
  description: string
  fullImportFee: number | null
  consumptionSpendingFee: number | null
  taxAdvance: number | null
  unitType: string | null
  classificationNoteName: string | null
  classificationNotePath: string | null
  productImageName: string | null
  productImagePath: string | null
  status: 'pending_review' | 'approved' | 'rejected'
}

export default function HscodeReview() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [reasonById, setReasonById] = useState<Record<string, string>>({})
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [details, setDetails] = useState<Row | null>(null)

  async function refresh() {
    setLoading(true)
    try {
      const res = await apiGet<{ success: true; data: Row[] }>(
        '/api/hscodes?status=pending_review',
      )
      setRows(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-semibold">بانتظار التدقيق</div>
        <div className="text-xs text-[rgb(var(--muted))]">اعتماد/رفض قبل الإظهار لباقي المستخدمين</div>
      </div>

      <Card className="hidden overflow-hidden md:block">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full border-collapse text-right text-sm">
            <thead className="sticky top-0 bg-[rgb(var(--surface))]">
              <tr className="border-b border-[rgb(var(--border))] text-xs text-[rgb(var(--muted))]">
                <th className="px-4 py-3">الرمز</th>
                <th className="px-4 py-3">الوصف</th>
                <th className="px-4 py-3">نوع الوحدة</th>
                <th className="px-4 py-3">رسم الاستيراد الكامل</th>
                <th className="px-4 py-3">رسم الإنفاق الاستهلاكي</th>
                <th className="px-4 py-3">السلفة الضريبية</th>
                <th className="hidden px-4 py-3 lg:table-cell">المرفقات</th>
                <th className="px-4 py-3">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-center text-[rgb(var(--muted))]" colSpan={8}>
                    جارٍ التحميل...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-[rgb(var(--muted))]" colSpan={8}>
                    لا توجد سجلات بانتظار التدقيق
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    className="cursor-pointer border-b border-[rgb(var(--border))] align-top hover:bg-[rgb(var(--surface-2))]"
                    onClick={() => {
                      setDetails(r)
                      setDetailsOpen(true)
                    }}
                  >
                    <td className="px-4 py-3 font-medium">{r.code}</td>
                    <td className="px-4 py-3">
                      <div className="line-clamp-3">{r.description}</div>
                      <div className="mt-2 max-w-xl">
                        <div className="mb-1 text-xs text-[rgb(var(--muted))]">سبب الرفض (عند الحاجة)</div>
                        <Input
                          value={reasonById[r.id] ?? ''}
                          onChange={(e) =>
                            setReasonById((prev) => ({ ...prev, [r.id]: e.target.value }))
                          }
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
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
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <div className="flex min-w-44 flex-col gap-2 text-xs">
                        {r.classificationNotePath ? (
                          <a
                            className="text-blue-600 underline"
                            href={r.classificationNotePath}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            مذكرة التصنيف: {r.classificationNoteName ?? 'فتح الملف'}
                          </a>
                        ) : (
                          <span className="text-[rgb(var(--muted))]">مذكرة التصنيف: لا يوجد</span>
                        )}

                        {r.productImagePath ? (
                          <a
                            href={r.productImagePath}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <img
                              alt={r.productImageName ?? r.code}
                              className="h-20 w-20 rounded-lg object-cover ring-1 ring-[rgb(var(--border))]"
                              src={r.productImagePath}
                            />
                          </a>
                        ) : (
                          <span className="text-[rgb(var(--muted))]">صورة المنتج: لا يوجد</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={async (e) => {
                            e.stopPropagation()
                            await apiPost(`/api/hscodes/${r.id}/approve`, {})
                            await refresh()
                          }}
                        >
                          اعتماد
                        </Button>
                        <Button
                          variant="danger"
                          disabled={(reasonById[r.id] ?? '').trim().length === 0}
                          onClick={async (e) => {
                            e.stopPropagation()
                            await apiPost(`/api/hscodes/${r.id}/reject`, {
                              reason: (reasonById[r.id] ?? '').trim(),
                            })
                            await refresh()
                          }}
                        >
                          رفض
                        </Button>
                      </div>
                    </td>
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
          <Card className="p-4 text-sm text-[rgb(var(--muted))]">لا توجد سجلات بانتظار التدقيق</Card>
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
                <Tag tone="warn">{r.status}</Tag>
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
              </div>

              <div className="mt-3 grid gap-2">
                <div>
                  <div className="mb-1 text-xs text-[rgb(var(--muted))]">سبب الرفض (عند الحاجة)</div>
                  <Input
                    value={reasonById[r.id] ?? ''}
                    onChange={(e) =>
                      setReasonById((prev) => ({ ...prev, [r.id]: e.target.value }))
                    }
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={async (e) => {
                      e.stopPropagation()
                      await apiPost(`/api/hscodes/${r.id}/approve`, {})
                      await refresh()
                    }}
                  >
                    اعتماد
                  </Button>
                  <Button
                    className="flex-1"
                    variant="danger"
                    disabled={(reasonById[r.id] ?? '').trim().length === 0}
                    onClick={async (e) => {
                      e.stopPropagation()
                      await apiPost(`/api/hscodes/${r.id}/reject`, {
                        reason: (reasonById[r.id] ?? '').trim(),
                      })
                      await refresh()
                    }}
                  >
                    رفض
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

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
                <Tag tone="warn">{details.status}</Tag>
              </div>
            </div>

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
          </div>
        )}
      </Modal>
    </div>
  )
}
