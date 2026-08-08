-- Dual-SIM phones carry two IMEIs, so customers get a second slot.
-- Existing rows keep their single IMEI in `imei` and get an empty `imei2`.

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS imei2 text NOT NULL DEFAULT '';
