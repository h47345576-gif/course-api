-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    phone TEXT,
    avatar_url TEXT,
    google_id TEXT,
    role TEXT DEFAULT 'student', -- student, teacher, admin
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Courses Table
CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    instructor TEXT,
    category TEXT,
    thumbnail_url TEXT,
    price REAL DEFAULT 0,
    type TEXT DEFAULT 'mixed', -- video, text, pdf, mixed
    duration_minutes INTEGER DEFAULT 0,
    can_download BOOLEAN DEFAULT 1,
    requirements TEXT,
    extra_content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Lessons Table
CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'video', -- video, text, pdf
    content_url TEXT,
    duration_seconds INTEGER DEFAULT 0,
    order_num INTEGER DEFAULT 0,
    has_source_files BOOLEAN DEFAULT 0,
    source_files_url TEXT,
    text_content TEXT,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Enrollments Table
CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    progress REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE(user_id, course_id)
);

-- Lesson Progress Table
CREATE TABLE IF NOT EXISTS lesson_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    lesson_id INTEGER NOT NULL,
    is_completed BOOLEAN DEFAULT 0,
    completed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
    UNIQUE(user_id, lesson_id)
);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    method TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, confirmed, rejected
    receipt_image_url TEXT,
    transaction_id TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    confirmed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Certificates Table
CREATE TABLE IF NOT EXISTS certificates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    certificate_number TEXT UNIQUE NOT NULL,
    pdf_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE(user_id, course_id)
);
