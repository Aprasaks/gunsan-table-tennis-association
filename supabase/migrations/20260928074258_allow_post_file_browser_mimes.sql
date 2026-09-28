-- Browser-reported MIME types are inconsistent for HWP and Office files.
-- Signed upload URLs are only issued after server-side extension/size checks;
-- the finalize step validates images with Sharp and serves all files nosniff.
update storage.buckets
set allowed_mime_types = null
where id = 'post-files';
