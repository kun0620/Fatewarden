-- Spec 16: admin moderation stays in Supabase Dashboard; app only reads ban status and sends reports.

alter table public.profiles
  add column if not exists banned_at timestamptz,
  add column if not exists ban_reason text;

create index if not exists idx_profiles_banned_at
  on public.profiles (banned_at)
  where banned_at is not null;

comment on column public.profiles.banned_at is
  'Set by admins in Supabase Dashboard to suspend account access.';

comment on column public.profiles.ban_reason is
  'Admin-entered suspension reason shown only during login support flow.';
