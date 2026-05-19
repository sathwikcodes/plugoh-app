-- Campaign card creative generation: generated titles and public card images.

alter table if exists public.campaigns
  add column if not exists ai_title text,
  add column if not exists card_image_url text,
  add column if not exists card_image_path text,
  add column if not exists card_image_prompt text,
  add column if not exists creative_status text,
  add column if not exists creative_error text,
  add column if not exists creative_generated_at timestamptz;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'storage'
      and table_name = 'buckets'
  ) then
    insert into storage.buckets (id, name, public)
    values ('campaign-card-images', 'campaign-card-images', true)
    on conflict (id) do update
      set public = excluded.public;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'storage'
      and table_name = 'objects'
  ) then
    create policy "campaign card images are publicly readable"
      on storage.objects
      for select
      using (bucket_id = 'campaign-card-images');
  end if;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'storage'
      and table_name = 'objects'
  ) then
    create policy "service role can upload campaign card images"
      on storage.objects
      for insert
      with check (bucket_id = 'campaign-card-images' and auth.role() = 'service_role');
  end if;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'storage'
      and table_name = 'objects'
  ) then
    create policy "service role can update campaign card images"
      on storage.objects
      for update
      using (bucket_id = 'campaign-card-images' and auth.role() = 'service_role')
      with check (bucket_id = 'campaign-card-images' and auth.role() = 'service_role');
  end if;
exception
  when duplicate_object then null;
end $$;
