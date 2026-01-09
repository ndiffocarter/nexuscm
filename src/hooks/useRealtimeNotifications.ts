import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseRealtimeNotificationsOptions {
  userId?: string;
  onNewNotification?: (notification: any) => void;
}

export function useRealtimeNotifications({ userId, onNewNotification }: UseRealtimeNotificationsOptions) {
  const { toast } = useToast();

  const handleNewNotification = useCallback((payload: any) => {
    const notification = payload.new;
    
    // Show toast notification
    toast({
      title: notification.title,
      description: notification.message,
    });

    // Call custom callback if provided
    onNewNotification?.(notification);
  }, [toast, onNewNotification]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        handleNewNotification
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, handleNewNotification]);
}

// Hook for admin to receive all new notifications
export function useAdminRealtimeNotifications(onNewNotification?: (notification: any) => void) {
  const { toast } = useToast();

  const handleNewNotification = useCallback((payload: any) => {
    const notification = payload.new;
    
    toast({
      title: '📬 Nouvelle notification envoyée',
      description: notification.title,
    });

    onNewNotification?.(notification);
  }, [toast, onNewNotification]);

  useEffect(() => {
    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        handleNewNotification
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [handleNewNotification]);
}

// Hook for real-time transaction updates
export function useRealtimeTransactions(accountId?: string, onNewTransaction?: (transaction: any) => void) {
  const { toast } = useToast();

  const handleNewTransaction = useCallback((payload: any) => {
    const transaction = payload.new;
    
    const typeLabels: Record<string, string> = {
      credit: 'Crédit reçu',
      debit: 'Débit effectué',
      transfer: 'Virement'
    };

    toast({
      title: typeLabels[transaction.transaction_type] || 'Nouvelle transaction',
      description: `Montant: ${new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'XAF',
        minimumFractionDigits: 0
      }).format(transaction.amount)}`,
    });

    onNewTransaction?.(transaction);
  }, [toast, onNewTransaction]);

  useEffect(() => {
    if (!accountId) return;

    const channel = supabase
      .channel(`transactions-${accountId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `account_id=eq.${accountId}`
        },
        handleNewTransaction
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `recipient_account_id=eq.${accountId}`
        },
        handleNewTransaction
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [accountId, handleNewTransaction]);
}