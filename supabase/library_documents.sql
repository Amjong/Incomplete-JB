create extension if not exists pgcrypto;

create table if not exists public.library_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  title text not null,
  body text not null default '',
  block_depths jsonb not null default '[]'::jsonb,
  block_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists library_documents_user_slug_key
  on public.library_documents(user_id, slug);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_library_documents_updated_at on public.library_documents;

create trigger trg_library_documents_updated_at
before update on public.library_documents
for each row
execute function public.set_updated_at();

alter table public.library_documents enable row level security;

drop policy if exists "library_documents_select_own" on public.library_documents;
create policy "library_documents_select_own"
on public.library_documents
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "library_documents_insert_own" on public.library_documents;
create policy "library_documents_insert_own"
on public.library_documents
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "library_documents_update_own" on public.library_documents;
create policy "library_documents_update_own"
on public.library_documents
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "library_documents_delete_own" on public.library_documents;
create policy "library_documents_delete_own"
on public.library_documents
for delete
to authenticated
using (auth.uid() = user_id);
