import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

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
  const { toast } = useToast();

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
      console.error('Error fetching contacts:', error);
      toast({
        title: "Error",
        description: "Failed to load contacts",
        variant: "destructive",
      });
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
        toast({
          title: "Already in contacts",
          description: "This user is already in your contacts",
        });
        return false;
      }

      // Add contact (bidirectional)
      const { error: error1 } = await supabase
        .from('contacts')
        .insert({ user_id: user.id, contact_id: contactId });

      const { error: error2 } = await supabase
        .from('contacts')
        .insert({ user_id: contactId, contact_id: user.id });

      // Check if both operations had actual errors (not just duplicate key errors)
      const hasRealError1 = error1 && !error1.message?.includes('duplicate key');
      const hasRealError2 = error2 && !error2.message?.includes('duplicate key');

      if (hasRealError1 || hasRealError2) {
        throw hasRealError1 ? error1 : error2;
      }

      toast({
        title: "Contact added",
        description: "User added to your contacts successfully",
      });

      // Refresh contacts list
      fetchContacts();
      return true;
    } catch (error) {
      console.error('Error adding contact:', error);
      toast({
        title: "Error",
        description: "Failed to add contact",
        variant: "destructive",
      });
      return false;
    }
  };

  // Remove a contact
  const removeContact = async (contactId: string) => {
    if (!user) return false;

    try {
      // Remove contact (bidirectional)
      const { error: error1 } = await supabase
        .from('contacts')
        .delete()
        .eq('user_id', user.id)
        .eq('contact_id', contactId);

      const { error: error2 } = await supabase
        .from('contacts')
        .delete()
        .eq('user_id', contactId)
        .eq('contact_id', user.id);

      if (error1 || error2) throw error1 || error2;

      toast({
        title: "Contact removed",
        description: "User removed from your contacts",
      });

      // Refresh contacts list
      fetchContacts();
      return true;
    } catch (error) {
      console.error('Error removing contact:', error);
      toast({
        title: "Error",
        description: "Failed to remove contact",
        variant: "destructive",
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