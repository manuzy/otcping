import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Search, Filter, Calendar as CalendarIcon, User, MessageSquare, BookmarkIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { useChatSearch } from '@/hooks/useChatSearch';
import { useMessageBookmarks } from '@/hooks/useMessageBookmarks';
import { useMessageTemplates } from '@/hooks/useMessageTemplates';
import { ChatSearchResult } from '@/types/chat';

interface AdvancedSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResultSelect?: (result: ChatSearchResult) => void;
}

interface SearchFilters {
  query: string;
  dateFrom?: Date;
  dateTo?: Date;
  sender?: string;
  chatId?: string;
  messageType?: string;
  priority?: string;
  hasAttachments?: boolean;
  isBookmarked?: boolean;
}

export const AdvancedSearchModal = ({ open, onOpenChange, onResultSelect }: AdvancedSearchModalProps) => {
  const [filters, setFilters] = useState<SearchFilters>({ query: '' });
  const [activeTab, setActiveTab] = useState('messages');
  const [savedSearches, setSavedSearches] = useState<SearchFilters[]>([]);
  
  const { results: searchResults, loading, searchMessages } = useChatSearch();
  const { bookmarks } = useMessageBookmarks();
  const { templates } = useMessageTemplates();

  const handleSearch = async () => {
    if (!filters.query.trim()) return;

    switch (activeTab) {
      case 'messages':
        await searchMessages(filters.query, {
          chatId: filters.chatId,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          senderId: filters.sender,
        });
        break;
      case 'bookmarks':
        // Bookmarks are filtered in the UI
        break;
      case 'templates':
        // Templates are filtered in the UI
        break;
    }
  };

  const handleSaveSearch = () => {
    if (!filters.query.trim()) return;
    
    const newSearches = [...savedSearches, { ...filters }];
    setSavedSearches(newSearches);
    localStorage.setItem('savedSearches', JSON.stringify(newSearches));
  };

  const handleLoadSearch = (savedSearch: SearchFilters) => {
    setFilters(savedSearch);
  };

  const clearFilters = () => {
    setFilters({ query: '' });
  };

  useEffect(() => {
    const saved = localStorage.getItem('savedSearches');
    if (saved) {
      setSavedSearches(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (filters.query.trim()) {
      const debounceTimer = setTimeout(handleSearch, 300);
      return () => clearTimeout(debounceTimer);
    }
  }, [filters.query, activeTab]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Advanced Search
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search messages, bookmarks, templates..."
              value={filters.query}
              onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
              className="pl-10"
              autoFocus
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Date Range</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1">
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      {filters.dateFrom ? format(filters.dateFrom, 'MMM dd') : 'From'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <Calendar
                      mode="single"
                      selected={filters.dateFrom}
                      onSelect={(date) => setFilters(prev => ({ ...prev, dateFrom: date }))}
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1">
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      {filters.dateTo ? format(filters.dateTo, 'MMM dd') : 'To'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <Calendar
                      mode="single"
                      selected={filters.dateTo}
                      onSelect={(date) => setFilters(prev => ({ ...prev, dateTo: date }))}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Message Type</Label>
              <Select
                value={filters.messageType || ''}
                onValueChange={(value) => setFilters(prev => ({ ...prev, messageType: value || undefined }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  <SelectItem value="message">Messages</SelectItem>
                  <SelectItem value="trade_action">Trade Actions</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Priority</Label>
              <Select
                value={filters.priority || ''}
                onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value || undefined }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleSaveSearch} variant="outline" size="sm">
              Save Search
            </Button>
            <Button onClick={clearFilters} variant="outline" size="sm">
              <X className="h-3 w-3 mr-1" />
              Clear Filters
            </Button>
            {Object.keys(filters).length > 1 && (
              <Badge variant="secondary">
                {Object.values(filters).filter(Boolean).length - 1} filters active
              </Badge>
            )}
          </div>

          {/* Saved Searches */}
          {savedSearches.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Saved Searches</Label>
              <div className="flex flex-wrap gap-2">
                {savedSearches.map((search, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleLoadSearch(search)}
                    className="text-xs"
                  >
                    {search.query}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Results Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="messages" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Messages
              </TabsTrigger>
              <TabsTrigger value="bookmarks" className="flex items-center gap-2">
                <BookmarkIcon className="h-4 w-4" />
                Bookmarks
              </TabsTrigger>
              <TabsTrigger value="templates" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Templates
              </TabsTrigger>
            </TabsList>

            <TabsContent value="messages" className="space-y-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Searching messages...
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {searchResults.map((result) => (
                    <div
                      key={result.messageId}
                      className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => onResultSelect?.(result)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{result.senderName}</span>
                          <Badge variant="outline" className="text-xs">
                            {result.chatName}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(result.timestamp, 'MMM dd, HH:mm')}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{result.content}</p>
                      {result.context && (
                        <p className="text-xs text-muted-foreground mt-1">
                          ...{result.context}...
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : filters.query.trim() ? (
                <div className="text-center py-8 text-muted-foreground">
                  No messages found matching your search.
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="bookmarks" className="space-y-4">
              {bookmarks.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {bookmarks
                    .filter(bookmark => 
                      !filters.query.trim() || 
                      bookmark.messageContent.toLowerCase().includes(filters.query.toLowerCase()) ||
                      bookmark.notes?.toLowerCase().includes(filters.query.toLowerCase())
                    )
                    .map((bookmark) => (
                      <div
                        key={bookmark.id}
                        className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <BookmarkIcon className="h-4 w-4 text-primary" />
                            <Badge variant="secondary" className="text-xs">
                              {bookmark.category}
                            </Badge>
                            <span className="text-sm font-medium">{bookmark.chatName}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(bookmark.createdAt, 'MMM dd')}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{bookmark.messageContent}</p>
                        {bookmark.notes && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Note: {bookmark.notes}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No bookmarks found.
                </div>
              )}
            </TabsContent>

            <TabsContent value="templates" className="space-y-4">
              {templates.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {templates
                    .filter(template => 
                      !filters.query.trim() || 
                      template.name.toLowerCase().includes(filters.query.toLowerCase()) ||
                      template.content.toLowerCase().includes(filters.query.toLowerCase())
                    )
                    .map((template) => (
                      <div
                        key={template.id}
                        className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-primary" />
                            <span className="font-medium">{template.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {template.category}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            Used {template.usageCount} times
                          </span>
                        </div>
                        <p className="text-sm mt-1 line-clamp-2">{template.content}</p>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No templates found.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};