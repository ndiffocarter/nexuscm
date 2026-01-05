-- Add ticket_replies table for conversation between admin and client
CREATE TABLE public.ticket_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;

-- Policies for ticket_replies
CREATE POLICY "Users can view replies on their tickets"
ON public.ticket_replies
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets st
    WHERE st.id = ticket_replies.ticket_id AND st.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::user_role)
);

CREATE POLICY "Users can insert replies on their tickets"
ON public.ticket_replies
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id = ticket_replies.ticket_id AND st.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::user_role)
  )
);

-- Enable realtime for ticket_replies
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_replies;