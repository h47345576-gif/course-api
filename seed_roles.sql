-- Seed Admin and Teacher Accounts
-- Password for both is: 123456
-- Generated Hash: $2a$10$zJN9bHwrMoDPLrQh0iQ5C.U4xjvMOvYLHZ4LtwaGd9.r9nwX2E2nq

DELETE FROM users WHERE email IN ('admin@platform.com', 'teacher1@platform.com');

INSERT INTO users (name, email, password_hash, created_at) 
VALUES ('Admin User', 'admin@platform.com', '$2a$10$zJN9bHwrMoDPLrQh0iQ5C.U4xjvMOvYLHZ4LtwaGd9.r9nwX2E2nq', CURRENT_TIMESTAMP);

INSERT INTO users (name, email, password_hash, created_at) 
VALUES ('Teacher User', 'teacher1@platform.com', '$2a$10$zJN9bHwrMoDPLrQh0iQ5C.U4xjvMOvYLHZ4LtwaGd9.r9nwX2E2nq', CURRENT_TIMESTAMP);
