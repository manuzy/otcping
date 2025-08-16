import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Bold, Italic, Code, AtSign, Paperclip, Send, 
  Image, FileText, Smile, Bell, Hash
} from "lucide-react";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EnhancedMessage } from "@/types/chat";

interface RichMessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (content: string, attachments?: File[]) => Promise<boolean>;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  replyToMessage?: EnhancedMessage | null;
  onCancelReply?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export const RichMessageInput = ({
  value,
  onChange,
  onSend,
  onKeyDown,
  replyToMessage,
  onCancelReply,
  disabled = false,
  placeholder = "Type a message..."
}: RichMessageInputProps) => {
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showFormatting, setShowFormatting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const insertTextAtCursor = useCallback((text: string, wrapSelection = false) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    let newText = value;
    let newCursorPos = start;

    if (wrapSelection && selectedText) {
      // Wrap selected text
      newText = value.substring(0, start) + text + selectedText + text + value.substring(end);
      newCursorPos = start + text.length + selectedText.length + text.length;
    } else {
      // Insert text at cursor
      newText = value.substring(0, start) + text + value.substring(end);
      newCursorPos = start + text.length;
    }

    onChange(newText);
    
    // Set cursor position after state update
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [value, onChange]);

  const handleFormat = (format: string) => {
    switch (format) {
      case 'bold':
        insertTextAtCursor('**', true);
        break;
      case 'italic':
        insertTextAtCursor('*', true);
        break;
      case 'code':
        insertTextAtCursor('`', true);
        break;
      case 'mention':
        insertTextAtCursor('@');
        break;
      case 'alert':
        insertTextAtCursor('🔔 ALERT: ');
        break;
      case 'hash':
        insertTextAtCursor('#');
        break;
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    insertTextAtCursor(emoji);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if ((!value.trim() && attachments.length === 0) || sending) return;
    
    setSending(true);
    const success = await onSend(value.trim(), attachments);
    
    if (success) {
      onChange('');
      setAttachments([]);
      onCancelReply?.();
    }
    
    setSending(false);
  };

  const handleKeyDownInternal = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    
    // Toggle formatting shortcuts (only if not handled by parent)
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          // Only handle bold if not handled by parent Bloomberg shortcuts
          if (!['t', 's', 'e'].includes(e.key)) {
            e.preventDefault();
            handleFormat('bold');
          }
          break;
        case 'i':
          e.preventDefault();
          handleFormat('italic');
          break;
        case '`':
          e.preventDefault();
          handleFormat('code');
          break;
      }
    }
    
    onKeyDown?.(e);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="border rounded-lg bg-background">
      {/* Reply indicator */}
      {replyToMessage && (
        <div className="px-3 py-2 bg-muted/50 border-b flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Replying to:</span>
            <span className="truncate max-w-48">{replyToMessage.content}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancelReply}
            className="h-6 w-6 p-0"
          >
            ✕
          </Button>
        </div>
      )}

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="px-3 py-2 border-b">
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div key={index} className="flex items-center gap-2 bg-muted rounded p-2 text-sm">
                {file.type.startsWith('image/') ? (
                  <Image className="h-4 w-4" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                <span className="truncate max-w-32">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({formatFileSize(file.size)})
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAttachment(index)}
                  className="h-4 w-4 p-0"
                >
                  ✕
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formatting toolbar */}
      <div className="flex items-center justify-between p-2 border-b">
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFormat('bold')}
                  className="h-8 w-8 p-0"
                >
                  <Bold className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Bold (Ctrl+B)</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFormat('italic')}
                  className="h-8 w-8 p-0"
                >
                  <Italic className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Italic (Ctrl+I)</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFormat('code')}
                  className="h-8 w-8 p-0"
                >
                  <Code className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Code (Ctrl+`)</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Separator orientation="vertical" className="h-6" />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFormat('mention')}
                  className="h-8 w-8 p-0"
                >
                  <AtSign className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Mention (@)</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFormat('hash')}
                  className="h-8 w-8 p-0"
                >
                  <Hash className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Hashtag (#)</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFormat('alert')}
                  className="h-8 w-8 p-0"
                >
                  <Bell className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Alert</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center gap-1">
          <EmojiPicker onEmojiSelect={handleEmojiSelect}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Smile className="h-4 w-4" />
            </Button>
          </EmojiPicker>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 w-8 p-0"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Attach File</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Message input */}
      <div className="flex items-end gap-2 p-3">
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDownInternal}
            disabled={disabled || sending}
            className="min-h-[40px] max-h-32 resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            rows={1}
          />
        </div>
        
        <Button 
          onClick={handleSend}
          disabled={(!value.trim() && attachments.length === 0) || sending}
          size="icon"
          className="shrink-0"
        >
          {sending ? <LoadingSpinner size="sm" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        accept="image/*,application/pdf,.doc,.docx,.txt,.csv"
      />
    </div>
  );
};