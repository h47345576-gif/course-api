-- Migration: Add pricing columns to courses table
ALTER TABLE courses ADD COLUMN discount_percentage REAL DEFAULT 0;
ALTER TABLE courses ADD COLUMN original_price REAL DEFAULT 0;
