# دليل نشر Cloudflare Worker عبر المتصفح

هذا الدليل يشرح كيفية نشر الباك إيند يدوياً باستخدام لوحة تحكم Cloudflare Dashboard دون الحاجة لاستخدام التيرمينال المعقد.

## 1. إنشاء الـ Worker (الباك إيند)

1. اذهب إلى [dash.cloudflare.com](https://dash.cloudflare.com) وسجل دخولك.
2. من القائمة الجانبية، اختر **Workers & Pages**.
3. اضغط على زر **Create Application** ثم **Create Worker**.
4. سمِّ الـ Worker باسم مناسب (مثلاً `course-api`) واضغط **Deploy**.
5. بعد النشر الأولي، اضغط على **Edit Code**.

## 2. نسخ الكود (خطوة واحدة سهلة)

لقد قمت بدمج كل ملفات الكود في ملف واحد لتسهيل العملية عليك.

1. افتح الملف `cloudflare_worker/bundled_worker.ts` الموجود في مجلد المشروع لديك.
2. انسخ محتواه **بالكامل**.
3. في محرر Cloudflare (في المتصفح)، امسح كل الموجود في ملف `worker.ts` (أو `index.ts`).
4. **الصق** الكود الذي نسخته.
5. اضغط **Save and Deploy** (في الزاوية العليا اليمنى).

## 3. إعداد قاعدة البيانات (D1 Database)

1. ارجع إلى لوحة القيادة الرئيسية لـ Workers & Pages.
2. اختر **D1** من القائمة اليسرى.
3. اضغط **Create Database**.
4. اختر **Dashboard**، سمها `courses_db`، واضغط **Create**.
5. بعد الإنشاء، اذهب إلى تبويب **Console**.
6. افتح ملف `cloudflare_worker/schema.sql` من جهازك وانسخ محتواه.
7. الصقه في الـ Console واضغط **Execute**. (هذا سينشئ الجداول).

## 4. ربط قاعدة البيانات بالـ Worker

1. ارجع إلى الـ Worker الذي أنشأته (`course-api`).
2. اذهب إلى **Settings** > **Variables**.
3. انتقل لأسفل إلى قسم **D1 Database Bindings**.
4. اضغط **Add binding**.
5. في خانة Variable name اكتب: `DB` (بأحرف كبيرة).
6. اختر قاعدة البيانات `courses_db` التي أنشأتها.

## 5. إضافة المتغيرات السرية

1. في نفس صفحة المتغيرات (**Settings** > **Variables**).
2. في قسم **Environment Variables**، اضغط **Add variable**.
3. الاسم: `JWT_SECRET`.
4. القيمة: اكتب نصاً طويلاً وعشوائياً (مثل كلمة سر قوية).
5. اضغط **Save and Deploy**.

## 6. مبروك! 🎉

الآن الباك إيند يعمل!
رابط الـ API الخاص بك موجود في صفحة الـ Worker (تحت Preview أو Triggers).
سيكون شكله مثل: `https://course-api.username.workers.dev`

انسخ هذا الرابط وضعه في تطبيق Flutter في ملف `api_endpoints.dart`.
