
-- Allow public (anonymous) access to all data tables so the app can run without login
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faculty_contacts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminder_logs TO anon;

CREATE POLICY "Public can read activities" ON public.activities FOR SELECT TO anon USING (true);
CREATE POLICY "Public can update activities" ON public.activities FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Public can insert activities" ON public.activities FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public can manage contacts" ON public.faculty_contacts FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Public can read reminders" ON public.reminder_logs FOR SELECT TO anon USING (true);
CREATE POLICY "Public can insert reminders" ON public.reminder_logs FOR INSERT TO anon WITH CHECK (true);
