import { useState, useEffect, useCallback } from 'react';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Search, Clock, MessageSquare, User, Calendar, Filter } from 'lucide-react';
import { useChatSearch } from '@/hooks/useChatSearch';
import { useChats } from '@/hooks/useChats';
import { useContacts } from '@/hooks/useContacts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChatSearchResult } from '@/types/chat';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResultSelect?: (result: ChatSearchResult) => void;
}

export const SearchModal = ({ open, onOpenChange, onResultSelect }: SearchModalProps) => {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedChat, setSelectedChat] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [selectedSender, setSelectedSender] = useState<string>('');
  
  const { results, loading, searchMessages, clearResults } = useChatSearch();
  const { chats } = useChats();
  const { contacts } = useContacts();

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      clearResults();
      return;
    }

    const timeoutId = setTimeout(() => {
      searchMessages(query, {
        chatId: selectedChat || undefined,
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
        senderId: selectedSender || undefined,
      });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, selectedChat, dateRange, selectedSender, searchMessages, clearResults]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setQuery('');
    setShowFilters(false);
    setSelectedChat('');
    setDateRange({});
    setSelectedSender('');
    clearResults();
  }, [onOpenChange, clearResults]);

  const handleResultClick = useCallback((result: ChatSearchResult) => {
    onResultSelect?.(result);
    handleClose();
  }, [onResultSelect, handleClose]);

  const highlightText = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text;
    
    const queryWords = searchQuery.toLowerCase().split(/\s+/);
    let highlightedText = text;
    
    queryWords.forEach(word => {
      if (word.length > 0) {
        const regex = new RegExp(`(${word})`, 'gi');
        highlightedText = highlightedText.replace(regex, '<mark class="bg-primary/20 text-primary-foreground rounded px-1">$1</mark>');
      }
    });
    
    return highlightedText;
  };

  const filteredChats = chats.slice(0, 5); // Show top 5 recent chats
  const filteredContacts = contacts.slice(0, 5); // Show top 5 contacts

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="flex items-center border-b px-3">
        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        <CommandInput
          placeholder="Search messages, chats, or contacts..."
          value={query}
          onValueChange={setQuery}
          className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0"
        />
        <Button
          variant="ghost"
          size="sm"
          className="ml-2 h-8 w-8 p-0"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className={cn("h-4 w-4", showFilters && "text-primary")} />
        </Button>
      </div>

      {/* Quick Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 p-3 border-b bg-muted/50">
          <select
            value={selectedChat}
            onChange={(e) => setSelectedChat(e.target.value)}
            className="text-xs bg-background border border-border rounded px-2 py-1"
          >
            <option value="">All chats</option>
            {chats.map(chat => (
              <option key={chat.id} value={chat.id}>{chat.name}</option>
            ))}
          </select>
          
          <select
            value={selectedSender}
            onChange={(e) => setSelectedSender(e.target.value)}
            className="text-xs bg-background border border-border rounded px-2 py-1"
          >
            <option value="">All senders</option>
            {contacts.map(contact => (
              <option key={contact.id} value={contact.id}>{contact.display_name}</option>
            ))}
          </select>

          <input
            type="date"
            value={dateRange.from?.toISOString().split('T')[0] || ''}
            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value ? new Date(e.target.value) : undefined }))}
            className="text-xs bg-background border border-border rounded px-2 py-1"
            placeholder="From date"
          />
          
          <input
            type="date"
            value={dateRange.to?.toISOString().split('T')[0] || ''}
            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value ? new Date(e.target.value) : undefined }))}
            className="text-xs bg-background border border-border rounded px-2 py-1"
            placeholder="To date"
          />
        </div>
      )}

      <CommandList className="max-h-[400px] overflow-y-auto">
        {!query && (
          <>
            <CommandGroup heading="Recent Chats">
              {filteredChats.map((chat) => (
                <CommandItem
                  key={chat.id}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                  onSelect={() => {
                    setSelectedChat(chat.id);
                    setQuery(`in:${chat.name}`);
                  }}
                >
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">{chat.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {chat.isPublic ? 'Public' : 'Private'} chat
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandGroup heading="Contacts">
              {filteredContacts.map((contact) => (
                <CommandItem
                  key={contact.id}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                  onSelect={() => {
                    setSelectedSender(contact.id);
                    setQuery(`from:${contact.display_name}`);
                  }}
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">{contact.display_name}</div>
                    <div className="text-xs text-muted-foreground">
                      Search messages from this user
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {query && (
          <>
            {loading && (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                <Search className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </div>
            )}

            {!loading && results.length === 0 && (
              <CommandEmpty>
                <div className="text-center py-6">
                  <Search className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                  <div className="font-medium">No messages found</div>
                  <div className="text-sm text-muted-foreground">
                    Try adjusting your search terms or filters
                  </div>
                </div>
              </CommandEmpty>
            )}

            {!loading && results.length > 0 && (
              <CommandGroup heading={`${results.length} message${results.length === 1 ? '' : 's'} found`}>
                {results.map((result) => (
                  <CommandItem
                    key={result.messageId}
                    className="flex flex-col items-start gap-2 px-3 py-3 cursor-pointer hover:bg-accent/50 transition-colors"
                    onSelect={() => handleResultClick(result)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Badge variant="outline" className="text-xs">
                        {result.chatName}
                      </Badge>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs font-medium">{result.senderName}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(result.timestamp, 'MMM d, HH:mm')}
                      </span>
                    </div>
                    <div 
                      className="text-sm text-foreground w-full"
                      dangerouslySetInnerHTML={{ 
                        __html: highlightText(result.context, query) 
                      }}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>

      <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/50 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono">
            <span>↵</span>
          </kbd>
          <span>to select</span>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono">
            <span>Esc</span>
          </kbd>
          <span>to close</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>Search across all your messages</span>
        </div>
      </div>
    </CommandDialog>
  );
};