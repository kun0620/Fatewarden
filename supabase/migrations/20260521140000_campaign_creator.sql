-- Campaign Creator - extend the existing dashboard campaigns table for drafts.
alter table public.campaigns
  add column if not exists description text,
  add column if not exists draft_data jsonb,
  add column if not exists published_data jsonb,
  add column if not exists tags text[] not null default '{}',
  add column if not exists version text not null default '1.0.0',
  add column if not exists min_players integer not null default 1,
  add column if not exists max_players integer not null default 4,
  add column if not exists is_published boolean not null default false,
  add column if not exists published_at timestamptz;

update public.campaigns
set description = coalesce(description, summary, '')
where description is null;

alter table public.campaigns
  alter column draft_data set default '{}'::jsonb;

create index if not exists idx_campaigns_draft_author_updated
  on public.campaigns(author_id, updated_at desc)
  where draft_data is not null;

create index if not exists idx_campaigns_published
  on public.campaigns(is_published, updated_at desc);
