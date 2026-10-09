-- Storage: two buckets.
--   media-public  – public read. Product photos and PUBLISHED gallery / feedback images.
--   media-private – no public access at all. Drafts, unpublished gallery images and unreviewed feedback screenshots.
-- Publishing a gallery image or feedback screenshot moves it private -> public (done by the dashboard).
-- Server-side limits: 5 MB per file, JPEG / PNG / WebP only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('media-public', 'media-public', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('media-private', 'media-private', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Only the owner may list/read/write objects through the API. Public bucket files are served by URL
-- (no policy needed); the private bucket has no anonymous read policy, so it is unreachable.
create policy "owner read media" on storage.objects for select to authenticated
  using (bucket_id in ('media-public', 'media-private') and public.is_admin());
create policy "owner upload media" on storage.objects for insert to authenticated
  with check (bucket_id in ('media-public', 'media-private') and public.is_admin());
create policy "owner update media" on storage.objects for update to authenticated
  using (bucket_id in ('media-public', 'media-private') and public.is_admin())
  with check (bucket_id in ('media-public', 'media-private') and public.is_admin());
create policy "owner delete media" on storage.objects for delete to authenticated
  using (bucket_id in ('media-public', 'media-private') and public.is_admin());
