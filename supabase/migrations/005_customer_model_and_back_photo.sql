-- Device model number, and a second photo so front and back of the device
-- can both be recorded. The existing photo_path stays the front photo.

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS model text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS photo_back_path text;
