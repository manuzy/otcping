-- Create enums for new profile fields
CREATE TYPE public.kyc_level AS ENUM ('Level 0', 'Level 1', 'Level 2');
CREATE TYPE public.trader_type AS ENUM ('Degen', 'Institutional');

-- Create data_licenses table with the provided license data
CREATE TABLE public.data_licenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  region_code TEXT NOT NULL,
  region TEXT NOT NULL,
  license_name TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on data_licenses table
ALTER TABLE public.data_licenses ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access to licenses
CREATE POLICY "Anyone can view licenses" 
ON public.data_licenses 
FOR SELECT 
USING (true);

-- Insert license data
INSERT INTO public.data_licenses (region_code, region, license_name, description) VALUES
('EU', 'European Union', 'CASP (MiCAR)', 'For crypto services like trading, custody, portfolio mgmt.'),
('EU', 'European Union', 'MiFID II Investment Firm License', 'For tokenized securities & investment services.'),
('EU', 'European Union', 'EMI License', 'For stablecoin issuance/payment flows.'),
('UK', 'United Kingdom', 'FCA Crypto Reg', 'AML registration under MLRs.'),
('UK', 'United Kingdom', 'FCA Investment Firm License', 'For securities dealing or broking.'),
('UK', 'United Kingdom', 'EMI/PI License', 'For payment or e-money services.'),
('US', 'United States', 'FinCEN MSB', 'Mandatory for most crypto firms.'),
('US', 'United States', 'State MTLs', 'For fiat/crypto transfers.'),
('US', 'United States', 'SEC Broker-Dealer License', 'For securities trading.'),
('US', 'United States', 'ATS License', 'For operating secondary markets.'),
('US', 'United States', 'CFTC Registration', 'For derivatives/margin trading.'),
('SG', 'Singapore', 'MPI (PSA)', 'For crypto trading, custody, transfer.'),
('SG', 'Singapore', 'CMS License', 'For digital securities.'),
('HK', 'Hong Kong', 'VASP (SFC)', 'For crypto exchanges and custodians.'),
('HK', 'Hong Kong', 'Type 1/7 License', 'For securities/tokenized assets.'),
('CH', 'Switzerland', 'FINMA VASP', 'AML-focused.'),
('CH', 'Switzerland', 'Securities Dealer License', 'For tokenized securities.'),
('CH', 'Switzerland', 'DLT Trading Facility License', 'Blockchain-based exchanges.'),
('AE', 'United Arab Emirates', 'VARA VASP', 'For exchanges, brokers, custodians, dealers.');

-- Add new columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN kyc_level public.kyc_level DEFAULT 'Level 0' NOT NULL,
ADD COLUMN trader_type public.trader_type DEFAULT 'Degen' NOT NULL,
ADD COLUMN licenses UUID[] DEFAULT '{}' NOT NULL;

-- Add trigger for data_licenses updated_at
CREATE TRIGGER update_data_licenses_updated_at
BEFORE UPDATE ON public.data_licenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();