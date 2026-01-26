# تعليمات نشر Cloudflare Worker

لقد تم إنشاء مشروع الباك إيند بنجاح. اتبع الخطوات التالية لنشره على الإنترنت واستخدامه في التطبيق.

## 1. المتطلبات المسبقة
تأكد من أنك قمت بتثبيت `npm` و `wrangler` (إذا لم تقم بذلك بعد):
```powershell
npm install -g wrangler
wrangler login
```

## 2. تثبيت الحزم (Dependencies)
افتح التيرمينال في مجلد `cloudflare_worker` ونفذ:
```powershell
cd cloudflare_worker
npm install
```

## 3. إعداد قاعدة البيانات (D1)
أنشئ قاعدة البيانات:
```powershell
wrangler d1 create courses_db
```
سيظهر لك `database_id` في المخرجات. انسخه وضعه في ملف `wrangler.toml` مكان `REPLACE_WITH_YOUR_DB_ID`.

ثم نفذ هذا الأمر لإنشاء الجداول:
```powershell
wrangler d1 execute courses_db --file=./schema.sql
```

## 4. إعداد التخزين (KV & R2)
أنشئ KV Namespace للجلسات:
```powershell
wrangler kv:namespace create SESSIONS
```
انسخ الـ `id` وضعه في `wrangler.toml` مكان `REPLACE_WITH_YOUR_KV_ID`.

(اختياري حالياً) أنشئ R2 Bucket للملفات من لوحة تحكم Cloudflare باسم `course-files`.

## 5. المتغيرات السرية
أضف مفتاح سري لتشفير الـ JWT:
```powershell
wrangler secret put JWT_SECRET
```
(أدخل أي نص طويل وعشوائي عندما يطلب منك).

## 6. النشر (Deploy)
الآن انشر المشروع:
```powershell
wrangler deploy
```

بعد النشر، سيظهر لك رابط الـ API (مثلاً `https://course-api.username.workers.dev`). انسخ هذا الرابط.

## 7. تحديث تطبيق Flutter
افتح ملف `lib/core/constants/api_endpoints.dart` في مشروع Flutter وحدث قيمة `baseUrl` بالرابط الجديد الذي نسخته.

```dart
static const String baseUrl = 'https://course-api.username.workers.dev/api/v1';
```

## 8. اختبار محلي (Development)
يمكنك تشغيل السيرفر محلياً للتجربة:
```powershell
npm run dev
```
