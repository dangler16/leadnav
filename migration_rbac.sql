-- LeadNav RBAC Migration
-- Run this in the Supabase SQL editor

-- ============================================================
-- 1. profiles.role: agent|admin → super_admin|team_admin|user
-- ============================================================

-- Drop constraint first, then migrate values, then re-add constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

UPDATE profiles SET role = 'user'        WHERE role = 'agent';
UPDATE profiles SET role = 'super_admin' WHERE role = 'admin';

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'team_admin', 'user'));

-- ============================================================
-- 2. team_members: drop leader/member role, add permissions
-- ============================================================

ALTER TABLE team_members DROP COLUMN IF EXISTS role;

ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS can_order         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS can_view_leads    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS can_make_calls    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS can_file_disputes BOOLEAN NOT NULL DEFAULT FALSE;

-- Each user belongs to exactly one team
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_user_id_key;
ALTER TABLE team_members ADD CONSTRAINT team_members_user_id_key UNIQUE (user_id);

-- ============================================================
-- 3. team_admin_assignments: maps team admins → teams they manage
-- ============================================================

CREATE TABLE IF NOT EXISTS team_admin_assignments (
  team_id    UUID        NOT NULL REFERENCES teams(id)    ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);

-- ============================================================
-- 4. disputes.status: pending|active|closed|lost → open|in_review|resolved|rejected
-- ============================================================

ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_status_check;

UPDATE disputes SET status = 'open'      WHERE status = 'pending';
UPDATE disputes SET status = 'in_review' WHERE status = 'active';
UPDATE disputes SET status = 'resolved'  WHERE status = 'closed';
UPDATE disputes SET status = 'rejected'  WHERE status = 'lost';

ALTER TABLE disputes ADD CONSTRAINT disputes_status_check
  CHECK (status IN ('open', 'in_review', 'resolved', 'rejected'));
