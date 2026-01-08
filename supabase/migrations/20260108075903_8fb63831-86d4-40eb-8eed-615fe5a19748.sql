-- Create bank_settings table for admin configuration
CREATE TABLE public.bank_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  setting_type TEXT NOT NULL DEFAULT 'string',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bank_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view and manage settings
CREATE POLICY "Admins can view settings" 
ON public.bank_settings 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can insert settings" 
ON public.bank_settings 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update settings" 
ON public.bank_settings 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can delete settings" 
ON public.bank_settings 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Add trigger for updated_at
CREATE TRIGGER update_bank_settings_updated_at
BEFORE UPDATE ON public.bank_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Insert default settings
INSERT INTO public.bank_settings (setting_key, setting_value, setting_type, description) VALUES
('interest_rate_savings', '3.5', 'number', 'Taux d''intérêt compte épargne (%)'),
('interest_rate_loan', '8.5', 'number', 'Taux d''intérêt prêt par défaut (%)'),
('transfer_fee_internal', '0', 'number', 'Frais de virement interne (XAF)'),
('transfer_fee_external', '500', 'number', 'Frais de virement externe (XAF)'),
('min_loan_amount', '50000', 'number', 'Montant minimum prêt (XAF)'),
('max_loan_amount', '50000000', 'number', 'Montant maximum prêt (XAF)'),
('min_loan_duration', '3', 'number', 'Durée minimum prêt (mois)'),
('max_loan_duration', '60', 'number', 'Durée maximum prêt (mois)'),
('bank_name', 'SecureBank', 'string', 'Nom de la banque'),
('bank_address', 'Douala, Cameroun', 'string', 'Adresse de la banque'),
('bank_phone', '+237 600 000 000', 'string', 'Téléphone de la banque'),
('bank_email', 'contact@securebank.cm', 'string', 'Email de la banque');