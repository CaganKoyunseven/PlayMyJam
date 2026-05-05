-- Adds is_priority column to queue_items to identify requested songs
alter table public.queue_items
  add column if not exists is_priority boolean default false;
