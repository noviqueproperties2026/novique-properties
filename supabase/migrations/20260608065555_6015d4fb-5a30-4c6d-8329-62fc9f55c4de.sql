
-- 1. listing_number + rank_order columns
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS listing_number TEXT,
  ADD COLUMN IF NOT EXISTS rank_order DOUBLE PRECISION;

-- Unique constraint for listing_number
CREATE UNIQUE INDEX IF NOT EXISTS listings_listing_number_key
  ON public.listings (listing_number);

CREATE INDEX IF NOT EXISTS listings_rank_order_idx
  ON public.listings (rank_order);

-- 2. Helper: generate a unique NQP-XXXXXXX number
CREATE OR REPLACE FUNCTION public.generate_listing_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate TEXT;
  attempts INT := 0;
BEGIN
  LOOP
    candidate := 'NQP-' || lpad(floor(random() * 10000000)::int::text, 7, '0');
    PERFORM 1 FROM public.listings WHERE listing_number = candidate;
    IF NOT FOUND THEN
      RETURN candidate;
    END IF;
    attempts := attempts + 1;
    IF attempts > 25 THEN
      RAISE EXCEPTION 'Unable to generate unique listing number';
    END IF;
  END LOOP;
END;
$$;

-- 3. Trigger: auto-assign listing_number + rank_order on insert
CREATE OR REPLACE FUNCTION public.set_listing_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  min_rank DOUBLE PRECISION;
BEGIN
  IF NEW.listing_number IS NULL OR NEW.listing_number = '' THEN
    NEW.listing_number := public.generate_listing_number();
  END IF;
  IF NEW.rank_order IS NULL THEN
    SELECT COALESCE(MIN(rank_order), 1) - 1 INTO min_rank FROM public.listings;
    NEW.rank_order := min_rank;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_listing_defaults ON public.listings;
CREATE TRIGGER trg_set_listing_defaults
  BEFORE INSERT ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.set_listing_defaults();

-- 4. Backfill existing rows with listing_number + rank_order
DO $$
DECLARE
  r RECORD;
  rk INT := 1;
BEGIN
  FOR r IN SELECT id FROM public.listings WHERE listing_number IS NULL LOOP
    UPDATE public.listings
      SET listing_number = public.generate_listing_number()
      WHERE id = r.id;
  END LOOP;

  -- Assign initial rank_order (newest first)
  FOR r IN SELECT id FROM public.listings ORDER BY created_at DESC LOOP
    UPDATE public.listings SET rank_order = rk WHERE id = r.id;
    rk := rk + 1;
  END LOOP;
END $$;

-- Enforce NOT NULL after backfill
ALTER TABLE public.listings
  ALTER COLUMN listing_number SET NOT NULL,
  ALTER COLUMN rank_order SET NOT NULL,
  ALTER COLUMN rank_order SET DEFAULT 0;

-- 5. listing_events table (history / audit per listing)
CREATE TABLE IF NOT EXISTS public.listing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  details JSONB,
  created_by UUID,
  created_by_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS listing_events_listing_id_idx
  ON public.listing_events (listing_id, created_at DESC);

GRANT SELECT ON public.listing_events TO authenticated;
GRANT ALL ON public.listing_events TO service_role;

ALTER TABLE public.listing_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view listing events" ON public.listing_events;
CREATE POLICY "Admins can view listing events"
  ON public.listing_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed an "uploaded" event for every existing listing
INSERT INTO public.listing_events (listing_id, event_type, details, created_at)
SELECT id, 'uploaded', jsonb_build_object('seeded', true), created_at
FROM public.listings
WHERE NOT EXISTS (
  SELECT 1 FROM public.listing_events e
  WHERE e.listing_id = public.listings.id AND e.event_type = 'uploaded'
);
