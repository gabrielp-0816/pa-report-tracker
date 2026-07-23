-- Add scanned_report_url column to activities table
ALTER TABLE public.activities ADD COLUMN scanned_report_url text;

-- Create scanned-reports storage bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('scanned-reports', 'scanned-reports', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for scanned-reports bucket
CREATE POLICY "Public Read Access" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'scanned-reports');

CREATE POLICY "Public Insert Access" ON storage.objects
  FOR INSERT TO public WITH CHECK (bucket_id = 'scanned-reports');

CREATE POLICY "Public Update Access" ON storage.objects
  FOR UPDATE TO public USING (bucket_id = 'scanned-reports') WITH CHECK (bucket_id = 'scanned-reports');

CREATE POLICY "Public Delete Access" ON storage.objects
  FOR DELETE TO public USING (bucket_id = 'scanned-reports');
