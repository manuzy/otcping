-- Add missing columns to trades table to store all form data
ALTER TABLE public.trades 
ADD COLUMN limit_price text,
ADD COLUMN usd_amount text,
ADD COLUMN sell_asset text,
ADD COLUMN buy_asset text,
ADD COLUMN expected_execution timestamp with time zone,
ADD COLUMN expiry_type text,
ADD COLUMN expiry_timestamp timestamp with time zone,
ADD COLUMN trigger_asset text,
ADD COLUMN trigger_condition text,
ADD COLUMN trigger_price text;