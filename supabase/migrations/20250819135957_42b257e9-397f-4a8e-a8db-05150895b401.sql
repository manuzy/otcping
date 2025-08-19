-- Update global theme setting to make ETF the default theme
UPDATE admin_settings 
SET global_theme = 'etf', updated_at = now() 
WHERE global_theme = 'system';

-- If no admin settings exist, create one with ETF as default
INSERT INTO admin_settings (user_id, global_theme, skip_approval) 
SELECT auth.uid(), 'etf', false
WHERE NOT EXISTS (SELECT 1 FROM admin_settings LIMIT 1);