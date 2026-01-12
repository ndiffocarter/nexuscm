-- Ajouter une colonne pour stocker la dernière IP connue
ALTER TABLE public.user_2fa_settings 
ADD COLUMN IF NOT EXISTS last_known_ip TEXT;