## التصميم التقني (MVP)

### 1) المعمارية
- Frontend: React + TypeScript + React Router + Tailwind + Zustand.
- Backend: Express (TypeScript, ESM) API تحت `/api`.
- Database: MySQL.

### 2) المصادقة
- تسجيل دخول: `/api/auth/login`.
- استخدام Cookie `httpOnly` لجلسة JWT (SameSite=Lax/Strict حسب البيئة) لتقليل تعرّض التوكن.
- تشفير كلمات المرور باستخدام bcrypt.

### 3) RBAC
- تعريف صلاحيات بصيغة `resource:action` مثل:
  - `users:read`, `users:write`
  - `hscodes:read`, `hscodes:write`, `hscodes:approve`
  - `audit:read`
- تطبيق الصلاحيات عبر Middleware على مسارات API.
- تطبيقها أيضاً على الواجهة بإخفاء الأزرار والروابط غير المسموحة.

### 4) إدارة الأجهزة (تقييد الدخول)
- MVP: توليد `device_id` داخل المتصفح وتخزينه في localStorage وإرساله في عملية الدخول.
- جدول `user_devices` لتخزين الأجهزة المسموحة لكل مستخدم أو كقائمة عامة.
- ملاحظة: لا يوجد حل ويب يضمن منع screenshots/video بالكامل، ويمكن فقط تطبيق ردع/سياسات جهاز/متصفح مؤسسية (سياسة MDM، أو Kiosk mode) خارج نطاق الويب البحت.

### 5) قاعدة البيانات (MySQL)
كيانات أساسية:
- `users`: بيانات المستخدم + الدور + حالة التفعيل + كلمة المرور (hash).
- `audit_logs`: أحداث التدقيق.
- `hscodes`: السجلات مع الحالة ومن أنشأ/عدّل ومن اعتمد.
- `user_devices`: ربط المستخدم بأجهزة مسموحة.

فهرسة مقترحة:
- `hscodes(code)`، وحقول نصية بحسب نمط البحث.

### 6) API (مختصر)
- Auth
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
- Users (superadmin)
  - `GET /api/users`
  - `POST /api/users`
  - `PATCH /api/users/:id`
  - `POST /api/users/:id/reset-password`
- HSCODE
  - `GET /api/hscodes?q=&status=`
  - `POST /api/hscodes` (publisher/superadmin)
  - `PATCH /api/hscodes/:id` (publisher/superadmin)
  - `DELETE /api/hscodes/:id` (superadmin)
  - `POST /api/hscodes/:id/approve` (auditor/superadmin)
  - `POST /api/hscodes/:id/reject` (auditor/superadmin)
- Audit
  - `GET /api/audit` (superadmin)

### 7) البحث (Debounce + Aggregation)
- الواجهة: إدخال بحث مع Debounce (300–500ms).
- الخادم: بناء استعلام بحث موحد عبر عدة حقول (OR LIKE) مع ترتيب بسيط.
- ترقية لاحقة (اختيارية): MySQL FULLTEXT على الأعمدة النصية.

