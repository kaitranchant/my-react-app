-- Allow images in form review storage bucket (0050)

update storage.buckets
set
  allowed_mime_types = array[
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
where id = 'form-reviews';
