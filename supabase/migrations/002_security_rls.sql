-- ============================================================
-- Migration 002: Security - Row Level Security with Anonymous Auth
-- ============================================================
-- This migration replaces the permissive RLS policies with
-- secure ones based on Supabase anonymous authentication.
--
-- PREREQUISITES:
-- 1. Enable Anonymous Sign-ins in Supabase Dashboard:
--    Authentication → Providers → Anonymous → Enable
-- ============================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "orders allow all" ON public.orders;
DROP POLICY IF EXISTS "order_items allow all" ON public.order_items;

-- ============================================================
-- ORDERS TABLE POLICIES
-- ============================================================

-- Anyone can view orders (needed for shared links)
CREATE POLICY "orders_select_public" ON public.orders
  FOR SELECT USING (true);

-- Authenticated users (including anonymous) can create orders
CREATE POLICY "orders_insert_authenticated" ON public.orders
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    host_id = auth.uid()::text
  );

-- Only the host can update their own orders
CREATE POLICY "orders_update_owner" ON public.orders
  FOR UPDATE USING (host_id = auth.uid()::text)
  WITH CHECK (host_id = auth.uid()::text);

-- Only the host can delete their own orders
CREATE POLICY "orders_delete_owner" ON public.orders
  FOR DELETE USING (host_id = auth.uid()::text);

-- ============================================================
-- ORDER_ITEMS TABLE POLICIES
-- ============================================================

-- Anyone can view items (needed for live order display)
CREATE POLICY "items_select_public" ON public.order_items
  FOR SELECT USING (true);

-- Anyone authenticated can add items to unlocked orders
CREATE POLICY "items_insert_unlocked" ON public.order_items
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_id AND locked = false
    )
  );

-- Only the order host can update items
CREATE POLICY "items_update_host" ON public.order_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_id AND host_id = auth.uid()::text
    )
  );

-- Only the order host can delete items
CREATE POLICY "items_delete_host" ON public.order_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_id AND host_id = auth.uid()::text
    )
  );

-- ============================================================
-- DATA VALIDATION CONSTRAINTS
-- ============================================================

-- Limit field lengths to prevent abuse
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_title_length,
  ADD CONSTRAINT orders_title_length CHECK (char_length(title) <= 100);

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_subtitle_length,
  ADD CONSTRAINT orders_subtitle_length CHECK (char_length(subtitle) <= 200);

ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS items_guest_name_length,
  ADD CONSTRAINT items_guest_name_length CHECK (char_length(guest_name) <= 50);

ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS items_dish_length,
  ADD CONSTRAINT items_dish_length CHECK (char_length(dish) <= 200);

ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS items_notes_length,
  ADD CONSTRAINT items_notes_length CHECK (char_length(notes) <= 500);

ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS items_price_valid,
  ADD CONSTRAINT items_price_valid CHECK (price IS NULL OR (price >= 0 AND price <= 99999.99));

-- ============================================================
-- OPTIONAL: Auto-expiration (uncomment if desired)
-- ============================================================
-- ALTER TABLE public.orders
--   ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT (now() + interval '7 days');
