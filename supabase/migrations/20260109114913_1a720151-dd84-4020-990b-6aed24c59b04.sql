-- Enable realtime for transactions only (notifications already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;