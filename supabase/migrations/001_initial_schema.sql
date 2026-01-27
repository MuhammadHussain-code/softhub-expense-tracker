-- Shop Tracker SaaS - Initial Schema
-- Multi-tenant schema with RLS policies

-- ============================================
-- TABLES
-- ============================================

-- Stores table
CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  currency text NOT NULL DEFAULT 'Rs',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Index for faster lookups by creator
CREATE INDEX IF NOT EXISTS idx_stores_created_by ON stores(created_by);

-- Store members table (for multi-tenant access control)
CREATE TABLE IF NOT EXISTS store_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'member')) DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(store_id, user_id)
);

-- Indexes for store_members
CREATE INDEX IF NOT EXISTS idx_store_members_user ON store_members(user_id);
CREATE INDEX IF NOT EXISTS idx_store_members_store ON store_members(store_id);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('work', 'expense')),
  description text NOT NULL DEFAULT '',
  amount numeric NOT NULL CHECK (amount >= 0),
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes for transactions
CREATE INDEX IF NOT EXISTS idx_transactions_store ON transactions(store_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(store_id, date);

-- ============================================
-- TRIGGER: Auto-add owner to store_members on store creation
-- ============================================

CREATE OR REPLACE FUNCTION add_store_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO store_members (store_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_store_created ON stores;
CREATE TRIGGER on_store_created
  AFTER INSERT ON stores
  FOR EACH ROW
  EXECUTE FUNCTION add_store_owner();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STORES POLICIES
-- ============================================

-- Users can view stores they are members of
CREATE POLICY "Users can view their stores"
  ON stores FOR SELECT
  USING (
    id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid())
  );

-- Users can create stores (they become owner via trigger)
CREATE POLICY "Users can create stores"
  ON stores FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Only owners can update their stores
CREATE POLICY "Owners can update their stores"
  ON stores FOR UPDATE
  USING (
    id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid() AND role = 'owner')
  );

-- Only owners can delete their stores
CREATE POLICY "Owners can delete their stores"
  ON stores FOR DELETE
  USING (
    id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid() AND role = 'owner')
  );

-- ============================================
-- STORE_MEMBERS POLICIES
-- ============================================

-- Users can view memberships for stores they belong to
CREATE POLICY "Users can view store memberships"
  ON store_members FOR SELECT
  USING (
    user_id = auth.uid() 
    OR store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid())
  );

-- Only owners can insert new members
CREATE POLICY "Owners can add members"
  ON store_members FOR INSERT
  WITH CHECK (
    store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid() AND role = 'owner')
  );

-- Only owners can update member roles
CREATE POLICY "Owners can update members"
  ON store_members FOR UPDATE
  USING (
    store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid() AND role = 'owner')
  );

-- Only owners can remove members
CREATE POLICY "Owners can remove members"
  ON store_members FOR DELETE
  USING (
    store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid() AND role = 'owner')
  );

-- ============================================
-- TRANSACTIONS POLICIES
-- ============================================

-- Members can view transactions for their stores
CREATE POLICY "Members can view transactions"
  ON transactions FOR SELECT
  USING (
    store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid())
  );

-- Members can insert transactions for their stores
CREATE POLICY "Members can insert transactions"
  ON transactions FOR INSERT
  WITH CHECK (
    store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid())
    AND auth.uid() = created_by
  );

-- Members can update transactions for their stores
CREATE POLICY "Members can update transactions"
  ON transactions FOR UPDATE
  USING (
    store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid())
  );

-- Members can delete transactions for their stores
CREATE POLICY "Members can delete transactions"
  ON transactions FOR DELETE
  USING (
    store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid())
  );
