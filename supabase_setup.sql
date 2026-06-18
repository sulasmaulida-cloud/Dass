-- ==========================================
-- SUPABASE DATABASE SETUP FOR DASS-42 SURVEY
-- ==========================================
-- Instructions:
-- 1. Open your Supabase Dashboard (https://supabase.com)
-- 2. Select your Project, then click on the "SQL Editor" tab in the left-hand menu.
-- 3. Click "New Query", paste this entire script inside the editor, and click "Run".
-- ==========================================

-- 1. Enable Cryptography Extension for secure password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Create Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Master Rooms (Unit/Ruang Medis) Table
CREATE TABLE IF NOT EXISTS rooms (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Survey Results Table
CREATE TABLE IF NOT EXISTS survey_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  nama_petugas TEXT NOT NULL,
  nama_responden TEXT NOT NULL,
  asal_ruangan TEXT NOT NULL,
  umur INTEGER NOT NULL,
  gender TEXT NOT NULL,
  score_depresi INTEGER NOT NULL,
  score_kecemasan INTEGER NOT NULL,
  score_stres INTEGER NOT NULL,
  kategori_depresi TEXT NOT NULL,
  kategori_kecemasan TEXT NOT NULL,
  kategori_stres TEXT NOT NULL,
  jawaban JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- SEED INITIAL DATA (DEFAULT MASTER)
-- ==========================================

-- Insert the Default Admin (Username: admin, Password: admin12345)
-- We secure this by encrypting the password with blowfish (bf) hashing
INSERT INTO admin_users (username, password_hash)
VALUES ('admin', crypt('admin12345', gen_salt('bf')))
ON CONFLICT (username) 
DO UPDATE SET password_hash = crypt('admin12345', EXCLUDED.password_hash);

-- Insert Default Medics/Rooms List
INSERT INTO rooms (name) VALUES
  ('Unit UGD'),
  ('Ruang Melati'),
  ('Unit Poliklinik'),
  ('Ruang Dahlia'),
  ('ICU')
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- DATABASE RPC FUNCTIONS (STORED PROCEDURES)
-- ==========================================

-- RPC: Verify Admin Login (Keeps credentials hidden on backend)
CREATE OR REPLACE FUNCTION verify_admin_login(p_username TEXT, p_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_match BOOLEAN;
BEGIN
  SELECT (password_hash = crypt(p_password, password_hash))
  INTO v_match
  FROM admin_users
  WHERE username = p_username;
  
  RETURN COALESCE(v_match, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Update Admin Password (If they want to change it later)
CREATE OR REPLACE FUNCTION update_admin_password(p_username TEXT, p_old_password TEXT, p_new_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_verified BOOLEAN;
BEGIN
  v_verified := verify_admin_login(p_username, p_old_password);
  IF v_verified THEN
    UPDATE admin_users
    SET password_hash = crypt(p_new_password, gen_salt('bf'))
    WHERE username = p_username;
    RETURN true;
  END IF;
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable Row Level Security on the tables
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- 1. admin_users security rules
-- strictly prohibit public or authenticated anon from direct select/insert/edit on admins table
CREATE POLICY "Admin table is strictly private" 
ON admin_users FOR ALL 
USING (false);

-- 2. rooms security rules
CREATE POLICY "Enable read access for anyone to see active rooms" 
ON rooms FOR SELECT 
USING (true);

-- Anyone can read or we can restrict, let's allow insert/delete for all (with safety) or via Anon key.
-- Since we are connecting directly from the client using Anon Key, 
-- we will allow write operations to rooms and delete/view results.
-- To maintain flexibility for they who use anon, we can define direct anon capability.
CREATE POLICY "Enable insert for anyone" 
ON rooms FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Enable all actions for anyone on rooms" 
ON rooms FOR ALL 
USING (true);

-- 3. survey_results security rules
CREATE POLICY "Enable read access for anyone to see results" 
ON survey_results FOR SELECT 
USING (true);

CREATE POLICY "Enable insert access for anyone to submit survey" 
ON survey_results FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Enable delete access for anyone to prune results" 
ON survey_results FOR ALL 
USING (true);

-- Let's print out setup confirmation
SELECT 'Supabase DASS-42 Database Successfully Provisioned!' AS result;
