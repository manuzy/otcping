import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { logger } from '@/lib/logger';
import { notifications } from '@/lib/notifications';

export interface ContactProfile {
  id: string;
  display_name: string;
  avatar?: string;
  description?: string;
  wallet_address?: string;
  is_public: boolean;
  reputation: number;
  successful_trades: number;
  total_trades: number;
  created_at: string;
}

export function useContacts() {
  const [contacts, setContacts] = useState<ContactProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Fetch user's contacts
  const fetchContacts = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          contact_id,
          profiles!contacts_contact_id_fkey (
            id,
            display_name,
            avatar,
            description,
            wallet_address,
            is_public,
            reputation,
            successful_trades,
            total_trades,
            created_at
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const contactProfiles = data
        ?.map(contact => contact.profiles)
        .filter(Boolean) as ContactProfile[];

      setContacts(contactProfiles || []);
    } catch (error) {
      logger.error('Error fetching contacts', {
        component: 'useContacts',
        operation: 'fetch_contacts',
        userId: user?.id
      }, error as Error);
      notifications.loadingError('contacts');
    } finally {
      setLoading(false);
    }
  };

  // Add a contact
  const addContact = async (contactId: string) => {
    if (!user) return false;

    try {
      // Check if contact already exists
      const { data: existing } = await supabase
        .from('contacts')
        .select('id')
        .eq('user_id', user.id)
        .eq('contact_id', contactId)
        .single();

      if (existing) {
        notifications.info({
          title: "Already in contacts",
          description: "This user is already in your contacts"
        });
        return false;
      }

      // Add contact (unidirectional)
      const { error } = await supabase
        .from('contacts')
        .insert({ user_id: user.id, contact_id: contactId });

      if (error) {
        // Log error for debugging
        logger.debug('Contact insertion error', {
          component: 'useContacts',
          operation: 'add_contact',
          metadata: { message: error.message, code: error.code, contactId }
        });
        
        // Check if it's a duplicate constraint violation
        const isDuplicateError = (err: any) => {
          if (!err) return false;
          const message = err.message?.toLowerCase() || '';
          return message.includes('duplicate key') || 
                 message.includes('unique constraint') ||
                 message.includes('already exists') ||
                 err.code === '23505'; // PostgreSQL unique violation code
        };

        // If it's a duplicate, treat as success
        if (isDuplicateError(error)) {
          notifications.info({
            title: "Already in contacts",
            description: "This user is already in your contacts"
          });
          return false;
        }

        // Otherwise, it's a real error
        throw error;
      }

      notifications.success({
        title: "Contact added",
        description: "User added to your contacts successfully"
      });

      // Refresh contacts list
      fetchContacts();
      return true;
    } catch (error) {
      logger.error('Error adding contact', {
        component: 'useContacts',
        operation: 'add_contact',
        metadata: { contactId }
      }, error as Error);
      notifications.error({
        title: "Error",
        description: "Failed to add contact"
      });
      return false;
    }
  };

  // Remove a contact
  const removeContact = async (contactId: string) => {
    if (!user) return false;

    try {
      // Remove contact (unidirectional)
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('user_id', user.id)
        .eq('contact_id', contactId);

      if (error) throw error;

      notifications.success({
        title: "Contact removed",
        description: "User removed from your contacts"
      });

      // Refresh contacts list
      fetchContacts();
      return true;
    } catch (error) {
      logger.error('Error removing contact', {
        component: 'useContacts',
        operation: 'remove_contact',
        metadata: { contactId }
      }, error as Error);
      notifications.error({
        title: "Error",
        description: "Failed to remove contact"
      });
      return false;
    }
  };

  // Check if a user is a contact
  const isContact = async (userId: string) => {
    if (!user) return false;

    try {
      const { data } = await supabase
        .from('contacts')
        .select('id')
        .eq('user_id', user.id)
        .eq('contact_id', userId)
        .single();

      return !!data;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [user]);

  // Set up real-time subscription for contact changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('contacts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contacts',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchContacts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          fetchContacts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    contacts,
    loading,
    addContact,
    removeContact,
    isContact,
    fetchContacts
  };
}