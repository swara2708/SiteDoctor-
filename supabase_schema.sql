-- Enable UUID generation extension if not enabled
create extension if not exists "uuid-ossp";

-- =========================================================================
-- 1. TABLE CREATION
-- =========================================================================

-- TABLE: profiles
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- TABLE: sites
create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  url text not null,
  nickname text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- TABLE: scans
create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites(id) on delete cascade not null,
  seo_score integer,
  trust_score integer,
  combined_score integer,
  seo_report jsonb,
  trust_report jsonb,
  image_flags jsonb,
  scanned_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =========================================================================
-- 2. TRIGGER AND FUNCTION FOR AUTOMATIC PROFILE CREATION
-- =========================================================================

-- Function to handle profile creation on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

-- Register the trigger on auth.users
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- =========================================================================
alter table public.profiles enable row level security;
alter table public.sites enable row level security;
alter table public.scans enable row level security;

-- =========================================================================
-- 4. ROW LEVEL SECURITY POLICIES
-- =========================================================================

-- Policies for Profiles
create policy "Users can select their own profile" 
  on public.profiles for select 
  using (auth.uid() = id);

create policy "Users can insert their own profile" 
  on public.profiles for insert 
  with check (auth.uid() = id);

create policy "Users can update their own profile" 
  on public.profiles for update 
  using (auth.uid() = id) 
  with check (auth.uid() = id);

create policy "Users can delete their own profile" 
  on public.profiles for delete 
  using (auth.uid() = id);


-- Policies for Sites
create policy "Users can select their own sites" 
  on public.sites for select 
  using (auth.uid() = user_id);

create policy "Users can insert their own sites" 
  on public.sites for insert 
  with check (auth.uid() = user_id);

create policy "Users can update their own sites" 
  on public.sites for update 
  using (auth.uid() = user_id) 
  with check (auth.uid() = user_id);

create policy "Users can delete their own sites" 
  on public.sites for delete 
  using (auth.uid() = user_id);


-- Policies for Scans (referencing parent sites)
create policy "Users can select scans of their own sites" 
  on public.scans for select 
  using (site_id in (select id from public.sites where user_id = auth.uid()));

create policy "Users can insert scans of their own sites" 
  on public.scans for insert 
  with check (site_id in (select id from public.sites where user_id = auth.uid()));

create policy "Users can update scans of their own sites" 
  on public.scans for update 
  using (site_id in (select id from public.sites where user_id = auth.uid()))
  with check (site_id in (select id from public.sites where user_id = auth.uid()));

create policy "Users can delete scans of their own sites" 
  on public.scans for delete 
  using (site_id in (select id from public.sites where user_id = auth.uid()));
