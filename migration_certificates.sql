-- Certificate Templates Table
CREATE TABLE IF NOT EXISTS certificate_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL UNIQUE,
    template_style TEXT DEFAULT 'classic',
    title TEXT DEFAULT 'شهادة إتمام',
    subtitle TEXT DEFAULT '',
    body_text TEXT DEFAULT '',
    signature_name TEXT DEFAULT '',
    signature_title TEXT DEFAULT '',
    accent_color TEXT DEFAULT '#6366f1',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);
