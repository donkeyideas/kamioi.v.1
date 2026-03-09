-- Allow users to SELECT their own submitted mappings (or shared null-user ones)
CREATE POLICY "llm_mappings_select_own"
  ON public.llm_mappings FOR SELECT
  USING (
    user_id = public.get_user_id()
    OR user_id IS NULL
    OR public.is_admin()
  );
