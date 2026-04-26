-- User profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
  account_id  uuid PRIMARY KEY REFERENCES public.careerlab_accounts(id) ON DELETE CASCADE,
  first_name  text NOT NULL DEFAULT '' ,
  surname     text NOT NULL DEFAULT '' ,
  direction   text NOT NULL DEFAULT '' ,
  level       text NOT NULL DEFAULT '' ,
  format      text NOT NULL DEFAULT '' ,
  city        text NOT NULL DEFAULT '' ,
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all" ON public.user_profiles
  USING (account_id::text = current_setting('request.jwt.claims', true)::json->>'sub')
  WITH CHECK (account_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

-- Resume analyses history
CREATE TABLE IF NOT EXISTS public.user_resume_analyses (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id  uuid NOT NULL REFERENCES public.careerlab_accounts(id) ON DELETE CASCADE,
  score       integer NOT NULL,
  result_json jsonb NOT NULL,
  target_role text,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ura_account_created ON public.user_resume_analyses(account_id, created_at DESC);

ALTER TABLE public.user_resume_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all" ON public.user_resume_analyses
  USING (account_id::text = current_setting('request.jwt.claims', true)::json->>'sub')
  WITH CHECK (account_id::text = current_setting('request.jwt.claims', true)::json->>'sub');
