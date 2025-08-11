-- Fix the incorrectly mapped Polygon WETH token on Base chain
-- This token should be on Polygon (chain_id 137), not Base (chain_id 8453)
UPDATE data_tokens 
SET chain_id = 137
WHERE address = '0xd4a0e0b9149bcee3c920d2e00b5de09138fd8bb7' 
AND chain_id = 8453 
AND symbol = 'aPolWETH';