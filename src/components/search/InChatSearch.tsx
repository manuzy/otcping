import { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { EnhancedMessage } from '@/types/chat';

interface InChatSearchProps {
  messages: EnhancedMessage[];
  isOpen: boolean;
  onClose: () => void;
  onMessageNavigate?: (messageId: string) => void;
}

export const InChatSearch = ({ messages, isOpen, onClose, onMessageNavigate }: InChatSearchProps) => {
  const [query, setQuery] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matches, setMatches] = useState<EnhancedMessage[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search messages
  useEffect(() => {
    if (!query.trim()) {
      setMatches([]);
      setCurrentIndex(0);
      return;
    }

    const filteredMessages = messages.filter(message =>
      message.content.toLowerCase().includes(query.toLowerCase())
    );

    setMatches(filteredMessages);
    setCurrentIndex(0);
  }, [query, messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Navigate to current match
  useEffect(() => {
    if (matches.length > 0 && matches[currentIndex]) {
      onMessageNavigate?.(matches[currentIndex].id);
    }
  }, [currentIndex, matches, onMessageNavigate]);

  const handlePrevious = () => {
    if (matches.length > 0) {
      setCurrentIndex(prev => prev === 0 ? matches.length - 1 : prev - 1);
    }
  };

  const handleNext = () => {
    if (matches.length > 0) {
      setCurrentIndex(prev => prev === matches.length - 1 ? 0 : prev + 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrevious();
      } else {
        handleNext();
      }
    }
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  const handleClose = () => {
    setQuery('');
    setMatches([]);
    setCurrentIndex(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="flex items-center gap-2 p-2 border-b bg-muted/50">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Search in this chat..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-4 h-8 text-sm"
        />
      </div>

      {matches.length > 0 && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {currentIndex + 1} of {matches.length}
          </Badge>
          
          <div className="flex">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevious}
              disabled={matches.length === 0}
              className="h-8 w-8 p-0"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNext}
              disabled={matches.length === 0}
              className="h-8 w-8 p-0"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={handleClose}
        className="h-8 w-8 p-0"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};