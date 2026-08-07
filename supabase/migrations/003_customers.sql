-- Shop Tracker SaaS - Customers
-- Customer job records (no payment data) + private photo storage

-- ============================================
-- TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  work_name text NOT NULL,
  customer_name text NOT NULL,
  imei text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  cnic text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  photo_path text,
  status text NOT NULL CHECK (status IN ('pending', 'delivered')) DEFAULT 'pending',
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_customers_store ON customers(store_id);
CREATE INDEX IF NOT EXISTS idx_customers_date ON customers(store_id, date);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view customers" ON customers;
CREATE POLICY "Members can view customers"
  ON customers FOR SELECT
  USING (
    store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Members can insert customers" ON customers;
CREATE POLICY "Members can insert customers"
  ON customers FOR INSERT
  WITH CHECK (
    store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid())
    AND auth.uid() = created_by
  );

DROP POLICY IF EXISTS "Members can update customers" ON customers;
CREATE POLICY "Members can update customers"
  ON customers FOR UPDATE
  USING (
    store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Members can delete customers" ON customers;
CREATE POLICY "Members can delete customers"
  ON customers FOR DELETE
  USING (
    store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid())
  );

-- ============================================
-- STORAGE: customer photos
-- ============================================
-- Private bucket. Object path is {store_id}/{customer_id}.jpg, so access is
-- granted by matching the first path segment against the caller's stores.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'customer-photos',
  'customer-photos',
  false,
  5242880, -- 5 MB; client compresses to ~200 KB, this is only a guard rail
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Members can read customer photos" ON storage.objects;
CREATE POLICY "Members can read customer photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'customer-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT store_id::text FROM store_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can upload customer photos" ON storage.objects;
CREATE POLICY "Members can upload customer photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'customer-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT store_id::text FROM store_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can update customer photos" ON storage.objects;
CREATE POLICY "Members can update customer photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'customer-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT store_id::text FROM store_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can delete customer photos" ON storage.objects;
CREATE POLICY "Members can delete customer photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'customer-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT store_id::text FROM store_members WHERE user_id = auth.uid()
    )
  );
