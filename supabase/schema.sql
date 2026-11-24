-- Phase 1 foundation: profiles and role enum.
-- Run this in Supabase SQL Editor.

create type public.app_role as enum ('admin', 'teacher', 'accountant');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.app_role not null default 'teacher',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A signed-in user can read their own profile.
create policy "Users can read own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

-- Profile creation is intentionally performed by a trusted admin workflow
-- or SQL editor during initial setup, not by an unrestricted public signup form.

create index profiles_role_idx on public.profiles(role);
