
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'staff',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read own role"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Auto-grant staff role on signup so any signed-in user can access the admin dashboard.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'staff')
    ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Activities / PAR tracking
CREATE TABLE public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_no integer,
  date_received date,
  time_received text,
  date_release_so date,
  time_release_so text,
  dts_ref text,
  faculty_name text NOT NULL,
  position text,
  contribution text,
  task_rendered text,
  date_activity text,
  institution text,
  with_coc text,
  par_received_at timestamptz,
  beneficiaries text,
  coc_issued_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.activities (faculty_name);
CREATE INDEX ON public.activities (par_received_at);
CREATE INDEX ON public.activities (date_received);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read activities"
  ON public.activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert activities"
  ON public.activities FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update activities"
  ON public.activities FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can delete activities"
  ON public.activities FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Faculty contact directory (for reminders)
CREATE TABLE public.faculty_contacts (
  faculty_name text PRIMARY KEY,
  email text,
  phone text,
  department text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faculty_contacts TO authenticated;
GRANT ALL ON public.faculty_contacts TO service_role;
ALTER TABLE public.faculty_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage contacts"
  ON public.faculty_contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Reminder log
CREATE TABLE public.reminder_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid REFERENCES public.activities(id) ON DELETE CASCADE,
  faculty_name text NOT NULL,
  email text,
  channel text NOT NULL DEFAULT 'email',
  status text NOT NULL DEFAULT 'sent',
  message text,
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.reminder_logs (activity_id);
CREATE INDEX ON public.reminder_logs (faculty_name);
GRANT SELECT, INSERT ON public.reminder_logs TO authenticated;
GRANT ALL ON public.reminder_logs TO service_role;
ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read reminders"
  ON public.reminder_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert reminders"
  ON public.reminder_logs FOR INSERT TO authenticated WITH CHECK (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER activities_updated BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER faculty_contacts_updated BEFORE UPDATE ON public.faculty_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
