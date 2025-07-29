-- Add chain_id column to trades table
ALTER TABLE public.trades ADD COLUMN chain_id INTEGER;

-- Update existing trades with chain_id based on chain name
UPDATE public.trades 
SET chain_id = data_chains.chain_id
FROM public.data_chains 
WHERE LOWER(trades.chain) = LOWER(data_chains.name);

-- Add foreign key constraint
ALTER TABLE public.trades 
ADD CONSTRAINT fk_trades_chain_id 
FOREIGN KEY (chain_id) REFERENCES public.data_chains(chain_id);