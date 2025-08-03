-- Add decimals column to data_tokens table with default value of 18
ALTER TABLE data_tokens ADD COLUMN decimals integer NOT NULL DEFAULT 18;

-- Update USDC tokens to have 6 decimals
UPDATE data_tokens SET decimals = 6 WHERE symbol = 'USDC';

-- Update USDT tokens to have 6 decimals  
UPDATE data_tokens SET decimals = 6 WHERE symbol = 'USDT';