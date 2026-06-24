import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { apiGet } from '@/utils/api'

type Row = {
  id: string
  eventType: string
  actorUsername: string | null
  targetType: string | null
  targetId: string | null
  summary: string | null
  createdAt: string
}

export default function Audit() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await apiGet<{ success: true; data: Row[] }>('/api/audit')
        if (!cancelled) setRows(res.data)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-semibold">سجل التدقيق</div>
        <div className="text-xs text-[rgb(var(--muted))]">آخر 500 حدث</div>
      </div>

      <Card className="hidden overflow-hidden md:block">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full border-collapse text-right text-sm">
            <thead className="sticky top-0 bg-[rgb(var(--surface))]">
              <tr className="border-b border-[rgb(var(--border))] text-xs text-[rgb(var(--muted))]">
                <th className="px-4 py-3">الوقت</th>
                <th className="px-4 py-3">الحدث</th>
                <th className="px-4 py-3">الممثل</th>
                <th className="px-4 py-3">الهدف</th>
                <th className="px-4 py-3">ملخص</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-center text-[rgb(var(--muted))]" colSpan={5}>
                    جارٍ التحميل...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-[rgb(var(--muted))]" colSpan={5}>
                    لا توجد بيانات
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-[rgb(var(--border))] hover:bg-[rgb(var(--surface-2))]">
                    <td className="px-4 py-3 text-xs text-[rgb(var(--muted))]">{String(r.createdAt)}</td>
                    <td className="px-4 py-3 font-medium">{r.eventType}</td>
                    <td className="px-4 py-3">{r.actorUsername ?? '-'}</td>
                    <td className="px-4 py-3">{r.targetType ? `${r.targetType}:${r.targetId ?? ''}` : '-'}</td>
                    <td className="px-4 py-3 text-xs text-[rgb(var(--muted))]">{r.summary ?? '-'}</td>
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
          <Card className="p-4 text-sm text-[rgb(var(--muted))]">لا توجد بيانات</Card>
        ) : (
          rows.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{r.eventType}</div>
                  <div className="mt-1 truncate text-xs text-[rgb(var(--muted))]">{String(r.createdAt)}</div>
                </div>
                <div className="text-xs text-[rgb(var(--muted))]">{r.actorUsername ?? '-'}</div>
              </div>

              <div className="mt-3 grid gap-1 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[rgb(var(--muted))]">الهدف</span>
                  <span className="truncate">{r.targetType ? `${r.targetType}:${r.targetId ?? ''}` : '-'}</span>
                </div>
                <div className="mt-1 whitespace-pre-wrap text-[rgb(var(--muted))]">{r.summary ?? '-'}</div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
