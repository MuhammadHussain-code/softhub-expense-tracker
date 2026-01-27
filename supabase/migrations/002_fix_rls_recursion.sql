-- Fix RLS infinite recursion in store_members policies
-- The issue: policies on store_members reference store_members, causing circular evaluation
-- Solution: Use SECURITY DEFINER functions that bypass RLS when checking membership

-- ============================================
-- HELPER FUNCTIONS (Security Definer to bypass RLS)
-- ============================================

-- Check if current user created this store
CREATE OR REPLACE FUNCTION is_store_creator(store_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM stores 
    WHERE id = store_uuid AND created_by = auth.uid()
  );
$$;

-- Check if current user is a member of this store
CREATE OR REPLACE FUNCTION is_store_member(store_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM store_members 
    WHERE store_id = store_uuid AND user_id = auth.uid()
  );
$$;

-- Check if current user is an owner of this store
CREATE OR REPLACE FUNCTION is_store_owner(store_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM store_members 
    WHERE store_id = store_uuid AND user_id = auth.uid() AND role = 'owner'
  );
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION is_store_creator(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_store_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_store_owner(uuid) TO authenticated;

-- ============================================
-- DROP EXISTING POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view their stores" ON stores;
DROP POLICY IF EXISTS "Users can create stores" ON stores;
DROP POLICY IF EXISTS "Owners can update their stores" ON stores;
DROP POLICY IF EXISTS "Owners can delete their stores" ON stores;

DROP POLICY IF EXISTS "Users can view store memberships" ON store_members;
DROP POLICY IF EXISTS "Owners can add members" ON store_members;
DROP POLICY IF EXISTS "Owners can update members" ON store_members;
DROP POLICY IF EXISTS "Owners can remove members" ON store_members;

DROP POLICY IF EXISTS "Members can view transactions" ON transactions;
DROP POLICY IF EXISTS "Members can insert transactions" ON transactions;
DROP POLICY IF EXISTS "Members can update transactions" ON transactions;
DROP POLICY IF EXISTS "Members can delete transactions" ON transactions;

-- ============================================
-- STORES POLICIES (using helper functions)
-- ============================================

-- Allow viewing if user is a member OR if they created it (needed for INSERT...RETURNING)
CREATE POLICY "Users can view their stores"
  ON stores FOR SELECT
  USING (is_store_member(id) OR created_by = auth.uid());

CREATE POLICY "Users can create stores"
  ON stores FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners can update their stores"
  ON stores FOR UPDATE
  USING (is_store_owner(id));

CREATE POLICY "Owners can delete their stores"
  ON stores FOR DELETE
  USING (is_store_owner(id));

-- ============================================
-- STORE_MEMBERS POLICIES (using helper functions)
-- ============================================

-- Users can see their own memberships OR memberships for stores they belong to
CREATE POLICY "Users can view store memberships"
  ON store_members FOR SELECT
  USING (user_id = auth.uid() OR is_store_member(store_id));

-- Store creators can add members (needed for trigger), OR existing owners can add members
CREATE POLICY "Owners can add members"
  ON store_members FOR INSERT
  WITH CHECK (is_store_creator(store_id) OR is_store_owner(store_id));

CREATE POLICY "Owners can update members"
  ON store_members FOR UPDATE
  USING (is_store_owner(store_id));

CREATE POLICY "Owners can remove members"
  ON store_members FOR DELETE
  USING (is_store_owner(store_id));

-- ============================================
-- TRANSACTIONS POLICIES (using helper functions)
-- ============================================

CREATE POLICY "Members can view transactions"
  ON transactions FOR SELECT
  USING (is_store_member(store_id));

CREATE POLICY "Members can insert transactions"
  ON transactions FOR INSERT
  WITH CHECK (is_store_member(store_id) AND auth.uid() = created_by);

CREATE POLICY "Members can update transactions"
  ON transactions FOR UPDATE
  USING (is_store_member(store_id));

CREATE POLICY "Members can delete transactions"
  ON transactions FOR DELETE
  USING (is_store_member(store_id));
