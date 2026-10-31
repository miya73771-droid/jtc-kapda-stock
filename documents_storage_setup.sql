-- JTC private document vault setup. Run once in Supabase Dashboard > SQL Editor.
-- This creates a private bucket and account-isolated document metadata.
alter table public.shop_settings add column if not exists udyam_number text not null default '';
alter table public.shop_settings add column if not exists show_udyam_on_bill boolean not null default false;
create table if not exists public.user_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_name text not null check (char_length(document_name) between 1 and 100),
  file_path text not null unique,
  content_type text not null check (content_type in ('application/pdf','image/jpeg','image/png')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  created_at timestamptz not null default now()
);
alter table public.user_documents enable row level security;
drop policy if exists "documents own rows" on public.user_documents;
create policy "documents own rows" on public.user_documents for all to authenticated
 using (auth.uid() = user_id) with check (auth.uid() = user_id);
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('jtc-private-documents','jtc-private-documents',false,10485760,array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set public=false, file_size_limit=10485760, allowed_mime_types=array['application/pdf','image/jpeg','image/png'];
drop policy if exists "JTC users read own documents" on storage.objects;
create policy "JTC users read own documents" on storage.objects for select to authenticated
 using (bucket_id='jtc-private-documents' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "JTC users upload own documents" on storage.objects;
create policy "JTC users upload own documents" on storage.objects for insert to authenticated
 with check (bucket_id='jtc-private-documents' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "JTC users delete own documents" on storage.objects;
create policy "JTC users delete own documents" on storage.objects for delete to authenticated
 using (bucket_id='jtc-private-documents' and (storage.foldername(name))[1]=auth.uid()::text);
