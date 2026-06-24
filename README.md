# نظام شركة البوابة الثامنة — MVP (Web)

## المتطلبات
- Node.js (مثبت)
- MySQL Server

## الإعداد
1) انسخ ملف البيئة:
- انسخ `.env.example` إلى `.env` ثم عدّل قيم MySQL و `AUTH_JWT_SECRET`.

2) أنشئ قاعدة بيانات (مرة واحدة):
- أنشئ قاعدة باسم `DB_NAME` (مثلاً `eight_gate`).

3) أنشئ الجداول وزرع حساب superadmin:
```bash
pnpm run db:setup
```

## التشغيل المحلي
```bash
pnpm run dev
```

الواجهة: `http://localhost:5173`

API: `http://localhost:3001/api/health`

## حساب تجريبي
- username: `superadmin`
- password: `Admin@1234`

## ملاحظات أمنية
- تقييد الأجهزة (MVP): فعّل `DEVICE_ENFORCE=1` لمنع الدخول من أجهزة غير مُدرجة.
- منع screenshots/video بالكامل غير ممكن من الويب، ويحتاج سياسات مؤسسية (MDM/Kiosk) خارج نطاق التطبيق.
