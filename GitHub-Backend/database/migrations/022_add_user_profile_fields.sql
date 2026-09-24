-- 022_add_user_profile_fields.sql
-- Add designation, company_name, phone_number, and contact_email to users table for full profile management

ALTER TABLE users ADD COLUMN IF NOT EXISTS designation VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);

-- Update default values for existing client users
UPDATE users SET designation = 'Engineering Executive', company_name = 'MasfiqurNehal Corp' WHERE email = 'admin1@masfiqurnehal.com' AND designation IS NULL;
UPDATE users SET designation = 'VP of Engineering', company_name = 'Betopia Global' WHERE email = 'admin@betopia.com' AND designation IS NULL;
UPDATE users SET designation = 'Lead DevOps Architect', company_name = 'Betopia Systems' WHERE email = 'admin2@betopia.com' AND designation IS NULL;
