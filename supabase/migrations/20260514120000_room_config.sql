-- Room configuration columns for sessions table
-- Adds support for rule strictness, party size, AI DM toggle, and visibility settings

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS party_size       smallint  DEFAULT 4    NOT NULL,
  ADD COLUMN IF NOT EXISTS allow_ai_dm      boolean   DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS visibility       text      DEFAULT 'invite_code' NOT NULL,
  ADD COLUMN IF NOT EXISTS rule_strictness  text      DEFAULT 'standard'    NOT NULL;

-- Add constraints for data integrity
ALTER TABLE sessions
  ADD CONSTRAINT sessions_visibility_check
    CHECK (visibility IN ('private','invite_code')),
  ADD CONSTRAINT sessions_strictness_check
    CHECK (rule_strictness IN ('casual','standard','hardcore')),
  ADD CONSTRAINT sessions_party_size_check
    CHECK (party_size BETWEEN 1 AND 8);
