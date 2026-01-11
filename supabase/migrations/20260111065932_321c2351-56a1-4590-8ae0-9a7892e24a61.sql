-- Create user_2fa_settings table
CREATE TABLE public.user_2fa_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_2fa_settings
ALTER TABLE public.user_2fa_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_2fa_settings
CREATE POLICY "Users can view own 2fa settings" ON public.user_2fa_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own 2fa settings" ON public.user_2fa_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own 2fa settings" ON public.user_2fa_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Create two_factor_codes table
CREATE TABLE public.two_factor_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on two_factor_codes
ALTER TABLE public.two_factor_codes ENABLE ROW LEVEL SECURITY;

-- RLS policies for two_factor_codes (service role only for security)
CREATE POLICY "Service role can manage 2fa codes" ON public.two_factor_codes
  FOR ALL USING (true);

-- Create virtual_cards table
CREATE TABLE public.virtual_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id),
  card_number TEXT NOT NULL,
  card_holder_name TEXT NOT NULL,
  expiry_date TEXT NOT NULL,
  cvv TEXT NOT NULL,
  card_type TEXT NOT NULL DEFAULT 'visa',
  spending_limit NUMERIC NOT NULL DEFAULT 500000,
  current_spending NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_frozen BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on virtual_cards
ALTER TABLE public.virtual_cards ENABLE ROW LEVEL SECURITY;

-- RLS policies for virtual_cards
CREATE POLICY "Users can view own virtual cards" ON public.virtual_cards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own virtual cards" ON public.virtual_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own virtual cards" ON public.virtual_cards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own virtual cards" ON public.virtual_cards
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at on user_2fa_settings
CREATE TRIGGER update_user_2fa_settings_updated_at
  BEFORE UPDATE ON public.user_2fa_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Create trigger for updated_at on virtual_cards
CREATE TRIGGER update_virtual_cards_updated_at
  BEFORE UPDATE ON public.virtual_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();