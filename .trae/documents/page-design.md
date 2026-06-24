## تصميم الصفحات (MVP)

### خريطة الصفحات
- `/login` تسجيل الدخول
- `/` لوحة تحكم بسيطة + روابط حسب الصلاحيات
- `/users` إدارة المستخدمين (superadmin)
- `/hscodes` قائمة HSCODE + بحث + تفاصيل
- `/hscodes/pending` انتظار التدقيق (auditor/superadmin)
- `/audit` سجل التدقيق (superadmin)

### 1) صفحة Login
- حقول: username, password.
- عرض رسالة خطأ عند فشل الدخول.

### 2) صفحة Users
- جدول: username, displayName, role, enabled, createdAt.
- أفعال: إنشاء/تعديل/تعطيل/إعادة تعيين كلمة المرور.

### 3) صفحة HSCODE
- شريط بحث أعلى + فلتر الحالة (يظهر فقط للمخولين).
- جدول: code, description, status, updatedAt.
- زر إضافة (publisher/superadmin).

### 4) صفحة Pending Review
- قائمة بالسجلات `pending_review`.
- أفعال: approve / reject مع حقل سبب عند الرفض.

### 5) صفحة Audit Log
- جدول قابل للفرز/التصفية: time, event, actor, target, summary.

