-- Ensure athletes can generate and read their own parent-link invite codes.
-- Parents still cannot browse invite codes; linking should use the RPC.

ALTER TABLE public.child_invite_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Children can view their own invite codes" ON public.child_invite_codes;
CREATE POLICY "Children can view their own invite codes"
  ON public.child_invite_codes
  FOR SELECT
  TO authenticated
  USING (child_id = auth.uid());

DROP POLICY IF EXISTS "Children can create their own invite codes" ON public.child_invite_codes;
CREATE POLICY "Children can create their own invite codes"
  ON public.child_invite_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (child_id = auth.uid());
