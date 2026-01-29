-- Add Courses
INSERT INTO courses (title, description, instructor, category, thumbnail_url, price, duration_minutes) VALUES 
('تعلم برمجة فلاتر من الصفر', 'دورة شاملة لتعلم تطوير تطبيقات الموبايل باستخدام Flutter و Dart', 'محمد أحمد', 'برمجة', 'https://storage.googleapis.com/cms-storage-bucket/0dbfcc7a59cd1cf16282.png', 150000, 1200),
('التصميم الجرافيكي للمبتدئين', 'تعلم أساسيات التصميم الجرافيكي باستخدام Photoshop و Illustrator', 'سارة علي', 'تصميم', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT8k5q6c8v4y3b3f2g1h0j9k8l7m6n5o4p3q2&s', 0, 800),
('أساسيات الذكاء الاصطناعي', 'مدخل إلى عالم الذكاء الاصطناعي وتعلم الآلة', 'أحمد محمود', 'ذكاء اصطناعي', 'https://www.simplilearn.com/ice9/free_resources_article_thumb/Types_of_Artificial_Intelligence.jpg', 200000, 1500),
('التسويق الرقمي الحديث', 'استراتيجيات التسويق عبر وسائل التواصل الاجتماعي وتحسين محركات البحث', 'نور هدى', 'تسويق', 'https://www.simplilearn.com/ice9/free_resources_article_thumb/What_is_digital_marketing.jpg', 100000, 900);

-- Add Lessons for Course 1 (Flutter)
INSERT INTO lessons (course_id, title, type, duration_seconds, order_num) VALUES 
(1, 'مقدمة في فلاتر', 'video', 600, 1),
(1, 'تثبيت بيئة العمل', 'video', 1200, 2),
(1, 'أساسيات لغة Dart', 'video', 1800, 3),
(1, 'بناء أول تطبيق', 'video', 2400, 4);

-- Add Lessons for Course 2 (Design)
INSERT INTO lessons (course_id, title, type, duration_seconds, order_num) VALUES 
(2, 'مفهوم الألوان', 'video', 900, 1),
(2, 'ادوات الفوتوشوب', 'video', 1500, 2);

-- Enroll 'admin3' and 'teacher4' in some courses to show stats
-- Assuming IDs: admin3 (user 10 or similar), teacher4 (user 11)
-- We will match by email to be safe in a real migration, but here we can just insert based on assumed recent IDs or use subqueries if supported by D1 fully (D1 supports subqueries).

INSERT OR IGNORE INTO enrollments (user_id, course_id) 
SELECT id, 1 FROM users WHERE email = 'admin3@platform.com';

INSERT OR IGNORE INTO enrollments (user_id, course_id) 
SELECT id, 2 FROM users WHERE email = 'admin3@platform.com';

INSERT OR IGNORE INTO enrollments (user_id, course_id) 
SELECT id, 1 FROM users WHERE email = 'teacher4@platform.com';
