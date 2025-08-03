-- Add token_amount column to trades table to store the actual token quantity
ALTER TABLE trades ADD COLUMN token_amount text;