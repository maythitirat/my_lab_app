-- Create storage bucket for payment slips (public read, anyone can insert)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'slips',
  'slips',
  true,
  5242880,  -- 5 MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow anonymous uploads (customers may not be "authenticated" via Supabase auth)
CREATE POLICY "Allow anon uploads to slips"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'slips');

-- Allow public reads
CREATE POLICY "Allow public reads from slips"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'slips');
