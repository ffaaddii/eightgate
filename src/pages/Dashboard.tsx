import { Card } from '@/components/ui/Card'
import { useAuthStore } from '@/stores/authStore'

export default function Dashboard() {
  const me = useAuthStore((s) => s.me)

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="p-4">
        <div className="text-sm font-semibold">الحالة</div>
        <div className="mt-1 text-xs text-[rgb(var(--muted))]">أنت مسجل الدخول كـ</div>
        <div className="mt-3 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-3">
          <div className="text-sm">{me?.username}</div>
          <div className="text-xs text-[rgb(var(--muted))]">{me?.role}</div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-semibold">ملاحظة أمنية</div>
        <div className="mt-2 text-xs leading-5 text-[rgb(var(--muted))]">
          المنع الكامل للـ screenshots/video غير ممكن تقنياً من الويب. تم توفير دعم تقييد الأجهزة على مستوى MVP عبر معرف جهاز داخل المتصفح ويمكن تفعيل الإلزام عبر `DEVICE_ENFORCE=1`.
        </div>
      </Card>
    </div>
  )
}
