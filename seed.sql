-- ==============================================
-- SEED DATA for Course Platform
-- Run this in Cloudflare D1 Console
-- ==============================================

-- ==================== USERS ====================
-- Password for all users: "123456" (hashed with bcrypt)
-- Hash: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n1.q3TQRzVxqSk8zNqC7m

-- Admin User
INSERT INTO users (name, email, password_hash, phone, avatar_url) VALUES 
('أحمد المدير', 'admin@platform.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n1.q3TQRzVxqSk8zNqC7m', '0912345678', 'https://ui-avatars.com/api/?name=Admin&background=6366f1&color=fff');

-- Teachers
INSERT INTO users (name, email, password_hash, phone, avatar_url) VALUES 
('محمد الأستاذ', 'teacher1@platform.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n1.q3TQRzVxqSk8zNqC7m', '0987654321', 'https://ui-avatars.com/api/?name=Mohammed&background=10b981&color=fff'),
('سارة المعلمة', 'teacher2@platform.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n1.q3TQRzVxqSk8zNqC7m', '0911223344', 'https://ui-avatars.com/api/?name=Sara&background=f59e0b&color=fff'),
('خالد المدرس', 'teacher3@platform.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n1.q3TQRzVxqSk8zNqC7m', '0955667788', 'https://ui-avatars.com/api/?name=Khaled&background=ef4444&color=fff');

-- Students
INSERT INTO users (name, email, password_hash, phone, avatar_url) VALUES 
('علي الطالب', 'student1@gmail.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n1.q3TQRzVxqSk8zNqC7m', '0933445566', 'https://ui-avatars.com/api/?name=Ali&background=8b5cf6&color=fff'),
('فاطمة الطالبة', 'student2@gmail.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n1.q3TQRzVxqSk8zNqC7m', '0944556677', 'https://ui-avatars.com/api/?name=Fatima&background=ec4899&color=fff'),
('عمر المتعلم', 'student3@gmail.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n1.q3TQRzVxqSk8zNqC7m', '0966778899', 'https://ui-avatars.com/api/?name=Omar&background=14b8a6&color=fff');


-- ==================== COURSES ====================

-- Course 1: Web Development
INSERT INTO courses (title, description, instructor, category, thumbnail_url, price, type, duration_minutes, can_download) VALUES 
('تطوير الويب الشامل', 'تعلم تطوير مواقع الويب من الصفر حتى الاحتراف باستخدام HTML, CSS, JavaScript وأطر العمل الحديثة', 'محمد الأستاذ', 'برمجة', 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400', 150000, 'video', 1200, 1);

-- Course 2: Flutter Development
INSERT INTO courses (title, description, instructor, category, thumbnail_url, price, type, duration_minutes, can_download) VALUES 
('تطوير تطبيقات Flutter', 'دورة شاملة لتعلم تطوير تطبيقات الموبايل باستخدام Flutter و Dart', 'سارة المعلمة', 'برمجة', 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400', 200000, 'video', 1800, 1);

-- Course 3: English Language
INSERT INTO courses (title, description, instructor, category, thumbnail_url, price, type, duration_minutes, can_download) VALUES 
('اللغة الإنجليزية للمبتدئين', 'تعلم اللغة الإنجليزية من الصفر مع تمارين تفاعلية ومحادثات عملية', 'خالد المدرس', 'لغات', 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400', 75000, 'mixed', 900, 1);

-- Course 4: Graphic Design
INSERT INTO courses (title, description, instructor, category, thumbnail_url, price, type, duration_minutes, can_download) VALUES 
('التصميم الجرافيكي بفوتوشوب', 'احترف التصميم الجرافيكي باستخدام Adobe Photoshop من البداية', 'محمد الأستاذ', 'تصميم', 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=400', 120000, 'video', 1500, 1);

-- Course 5: Mathematics (Free)
INSERT INTO courses (title, description, instructor, category, thumbnail_url, price, type, duration_minutes, can_download) VALUES 
('الرياضيات للصف التاسع', 'شرح منهج الرياضيات الكامل للصف التاسع مع حل تمارين', 'سارة المعلمة', 'أكاديمي', 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400', 0, 'video', 600, 1);


-- ==================== LESSONS ====================

-- Lessons for Course 1 (Web Development)
INSERT INTO lessons (course_id, title, description, type, content_url, duration_seconds, order_num, has_source_files, text_content) VALUES 
(1, 'مقدمة في تطوير الويب', 'نظرة عامة على تطوير الويب وأساسياته', 'video', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 600, 1, 0, NULL),
(1, 'أساسيات HTML', 'تعلم بنية صفحات الويب باستخدام HTML', 'video', 'https://www.youtube.com/watch?v=UB1O30fR-EE', 1200, 2, 1, NULL),
(1, 'تنسيق CSS', 'تعلم تنسيق الصفحات باستخدام CSS', 'video', 'https://www.youtube.com/watch?v=yfoY53QXEnI', 1500, 3, 1, NULL),
(1, 'مقدمة JavaScript', 'أساسيات البرمجة بلغة JavaScript', 'video', 'https://www.youtube.com/watch?v=W6NZfCO5SIk', 1800, 4, 1, NULL),
(1, 'مشروع عملي: صفحة ويب كاملة', 'بناء صفحة ويب متكاملة من الصفر', 'video', 'https://www.youtube.com/watch?v=mU6anWqZJcc', 2400, 5, 1, NULL),
(1, 'ملخص الدورة - PDF', 'ملف PDF يحتوي ملخص كامل للدورة', 'pdf', 'https://drive.google.com/file/d/1example/view', 0, 6, 0, NULL);

-- Lessons for Course 2 (Flutter)
INSERT INTO lessons (course_id, title, description, type, content_url, duration_seconds, order_num, has_source_files, text_content) VALUES 
(2, 'مقدمة في Flutter', 'ما هو Flutter ولماذا نستخدمه؟', 'video', 'https://www.youtube.com/watch?v=fq4N0hgOWzU', 900, 1, 0, NULL),
(2, 'تثبيت Flutter وإعداد البيئة', 'خطوات تثبيت Flutter على Windows/Mac', 'video', 'https://www.youtube.com/watch?v=1ukSR1GRtMU', 1200, 2, 0, NULL),
(2, 'أساسيات Dart', 'تعلم لغة Dart البرمجية', 'video', 'https://www.youtube.com/watch?v=Ej_Pcr4uC2Q', 1800, 3, 1, NULL),
(2, 'الـ Widgets الأساسية', 'شرح أهم Widgets في Flutter', 'video', 'https://www.youtube.com/watch?v=b_sQ9bMltGU', 2100, 4, 1, NULL),
(2, 'بناء تطبيق To-Do كامل', 'مشروع عملي لتطبيق قائمة مهام', 'video', 'https://www.youtube.com/watch?v=K4P1Fsa21kY', 3600, 5, 1, NULL),
(2, 'State Management مع Provider', 'إدارة الحالة باستخدام Provider', 'video', 'https://www.youtube.com/watch?v=3tm-R7ymwhc', 2400, 6, 1, NULL),
(2, 'الاتصال بـ APIs', 'كيفية جلب البيانات من الإنترنت', 'video', 'https://www.youtube.com/watch?v=4vKiJZNPhss', 1800, 7, 1, NULL);

-- Lessons for Course 3 (English)
INSERT INTO lessons (course_id, title, description, type, content_url, duration_seconds, order_num, has_source_files, text_content) VALUES 
(3, 'الحروف الأبجدية', 'تعلم نطق الحروف الإنجليزية', 'video', 'https://www.youtube.com/watch?v=75p-N9YKqNo', 600, 1, 0, NULL),
(3, 'الأرقام والألوان', 'تعلم الأرقام والألوان بالإنجليزية', 'video', 'https://www.youtube.com/watch?v=DN2v2Fy5dCE', 720, 2, 0, NULL),
(3, 'التحيات والتعارف', 'عبارات التحية والتعريف بالنفس', 'video', 'https://www.youtube.com/watch?v=csMIGDZT7FY', 900, 3, 0, NULL),
(3, 'قواعد المضارع البسيط', 'شرح Present Simple', 'text', '', 0, 4, 0, '# Present Simple\n\nنستخدم المضارع البسيط للعادات والحقائق.\n\n## التكوين:\n- I/You/We/They + verb\n- He/She/It + verb + s\n\n## أمثلة:\n- I **work** every day.\n- She **works** at a hospital.'),
(3, 'تمارين PDF', 'تمارين على الوحدات السابقة', 'pdf', 'https://drive.google.com/file/d/2example/view', 0, 5, 0, NULL);

-- Lessons for Course 4 (Photoshop)
INSERT INTO lessons (course_id, title, description, type, content_url, duration_seconds, order_num, has_source_files, text_content) VALUES 
(4, 'واجهة فوتوشوب', 'التعرف على واجهة البرنامج', 'video', 'https://www.youtube.com/watch?v=IyR_uYsRdPs', 1200, 1, 0, NULL),
(4, 'أدوات التحديد', 'شرح أدوات Selection المختلفة', 'video', 'https://www.youtube.com/watch?v=fmQT8BBvPSE', 1500, 2, 1, NULL),
(4, 'الطبقات Layers', 'كيفية العمل مع الطبقات', 'video', 'https://www.youtube.com/watch?v=2tyDJQikXPI', 1800, 3, 1, NULL),
(4, 'تصميم بوستر احترافي', 'مشروع عملي لتصميم بوستر', 'video', 'https://www.youtube.com/watch?v=JyHM9JCj5V4', 2400, 4, 1, NULL);

-- Lessons for Course 5 (Math)
INSERT INTO lessons (course_id, title, description, type, content_url, duration_seconds, order_num, has_source_files, text_content) VALUES 
(5, 'المعادلات من الدرجة الأولى', 'حل المعادلات البسيطة', 'video', 'https://www.youtube.com/watch?v=NybHckSEQBI', 1200, 1, 0, NULL),
(5, 'المعادلات من الدرجة الثانية', 'حل المعادلات التربيعية', 'video', 'https://www.youtube.com/watch?v=i7idZfS8t8w', 1500, 2, 1, NULL),
(5, 'الهندسة: المثلثات', 'خصائص المثلثات وأنواعها', 'video', 'https://www.youtube.com/watch?v=mLeNaZcy1hE', 1200, 3, 0, NULL);


-- ==================== ENROLLMENTS ====================

-- Student 1 enrolled in courses 1, 2, 5
INSERT INTO enrollments (user_id, course_id, progress) VALUES 
(5, 1, 0.6),
(5, 2, 0.3),
(5, 5, 0.8);

-- Student 2 enrolled in courses 2, 3
INSERT INTO enrollments (user_id, course_id, progress) VALUES 
(6, 2, 0.5),
(6, 3, 0.2);

-- Student 3 enrolled in courses 1, 4, 5
INSERT INTO enrollments (user_id, course_id, progress) VALUES 
(7, 1, 0.1),
(7, 4, 0.4),
(7, 5, 1.0);


-- ==================== LESSON PROGRESS ====================

-- Student 1 progress
INSERT INTO lesson_progress (user_id, lesson_id, is_completed, completed_at) VALUES 
(5, 1, 1, '2026-01-15 10:00:00'),
(5, 2, 1, '2026-01-16 11:00:00'),
(5, 3, 1, '2026-01-17 09:00:00'),
(5, 4, 0, NULL),
(5, 7, 1, '2026-01-18 14:00:00'),
(5, 8, 1, '2026-01-19 16:00:00');

-- Student 2 progress
INSERT INTO lesson_progress (user_id, lesson_id, is_completed, completed_at) VALUES 
(6, 7, 1, '2026-01-20 10:00:00'),
(6, 8, 1, '2026-01-21 11:00:00'),
(6, 9, 0, NULL);


-- ==================== PAYMENTS ====================

INSERT INTO payments (user_id, course_id, amount, method, status, transaction_id, notes, confirmed_at) VALUES 
(5, 1, 150000, 'sham_cash', 'confirmed', 'TXN001234', 'دفعة كاملة', '2026-01-10 12:00:00'),
(5, 2, 200000, 'syriatel_cash', 'confirmed', 'TXN001235', NULL, '2026-01-12 14:00:00'),
(6, 2, 200000, 'bank_transfer', 'confirmed', 'TXN001236', 'حوالة بنكية', '2026-01-14 09:00:00'),
(6, 3, 75000, 'mtn_cash', 'pending', NULL, 'في انتظار التأكيد', NULL),
(7, 1, 150000, 'sham_cash', 'confirmed', 'TXN001238', NULL, '2026-01-18 11:00:00'),
(7, 4, 120000, 'manual_delivery', 'confirmed', 'TXN001239', 'تسليم يدوي في المكتب', '2026-01-20 10:00:00');


-- ==================== CERTIFICATES ====================

INSERT INTO certificates (user_id, course_id, certificate_number, pdf_url) VALUES 
(7, 5, 'CERT-2026-00001', 'https://drive.google.com/file/d/cert1/view');


-- ==================== SUMMARY ====================
-- Users: 7 (1 Admin, 3 Teachers, 3 Students)
-- Courses: 5
-- Lessons: 25
-- Enrollments: 8
-- Payments: 6
-- Certificates: 1
--
-- Login credentials (all passwords: 123456):
-- Admin: admin@platform.com
-- Teachers: teacher1@platform.com, teacher2@platform.com, teacher3@platform.com
-- Students: student1@gmail.com, student2@gmail.com, student3@gmail.com
