-- Add par_urls and coc_urls array columns to activities table
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS par_urls text[] DEFAULT '{}'::text[];
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS coc_urls text[] DEFAULT '{}'::text[];

-- Migrate any existing scanned_report_url into par_urls
UPDATE public.activities 
SET par_urls = ARRAY[scanned_report_url] 
WHERE scanned_report_url IS NOT NULL AND (par_urls IS NULL OR array_length(par_urls, 1) IS NULL);
