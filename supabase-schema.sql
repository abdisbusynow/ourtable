-- ============================================================
-- Our Table — Supabase Schema
-- Run this in your Supabase project's SQL Editor
-- ============================================================

-- Restaurants table
create table if not exists restaurants (
  id          bigint generated always as identity primary key,
  created_at  timestamptz default now(),
  name        text not null,
  cuisine     text default 'Other',
  location    text default '',
  address     text default '',
  lat         float,
  lng         float,
  status      text default 'want-to-go' check (status in ('want-to-go', 'visited')),
  date_visited date,
  rating_a    int default 0 check (rating_a between 0 and 5),
  rating_b    int default 0 check (rating_b between 0 and 5),
  note        text default ''
);

-- Settings table (for PIN storage)
create table if not exists settings (
  key   text primary key,
  value text not null
);

-- Insert a default PIN (change '1234' to whatever you want!)
insert into settings (key, value)
values ('edit_pin', '1234')
on conflict (key) do nothing;

-- Enable real-time for the restaurants table
alter publication supabase_realtime add table restaurants;

-- Allow public read access (anyone can VIEW the list)
alter table restaurants enable row level security;
alter table settings enable row level security;

create policy "Public can read restaurants"
  on restaurants for select using (true);

create policy "Public can read settings"
  on settings for select using (true);

-- Allow all writes from the anon key (PIN is enforced in the app)
-- This is fine for a private 2-person app
create policy "Anon can insert restaurants"
  on restaurants for insert with check (true);

create policy "Anon can update restaurants"
  on restaurants for update using (true);

create policy "Anon can delete restaurants"
  on restaurants for delete using (true);
