import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Calendar, FileText, Send, Bookmark, 
  Clock, Archive, Download, Keyboard
} from "lucide-react";
import { MessageScheduler } from './MessageScheduler';
import { TemplateManager } from './TemplateManager';
import { BlastMessageComposer } from './BlastMessageComposer';
import { BookmarkManager } from './BookmarkManager';
import { ShortcutsHelp } from './ShortcutsHelp';
import { useToast } from "@/hooks/use-toast";

interface BloombergToolbarProps {
  chatId: string;
  onBookmark?: () => void;
  onExport?: () => void;
  onShortcuts?: () => void;
}

export const BloombergToolbar = ({ 
  chatId, 
  onBookmark,
  onExport,
  onShortcuts 
}: BloombergToolbarProps) => {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const { toast } = useToast();

  const handleQuickExport = () => {
    onExport?.();
    toast({
      title: "Export Started",
      description: "Your chat export will be ready shortly.",
    });
  };

  const handleShortcutsHelp = () => {
    setShowShortcuts(true);
    onShortcuts?.();
  };

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-muted/30 border-b border-border/50">
      <TooltipProvider>
        {/* Scheduling */}
        <Tooltip>
          <TooltipTrigger asChild>
            <MessageScheduler
              chatId={chatId}
              trigger={
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <Calendar className="h-4 w-4 mr-1" />
                  Schedule
                </Button>
              }
            />
          </TooltipTrigger>
          <TooltipContent>Schedule Message (Ctrl+S)</TooltipContent>
        </Tooltip>

        {/* Templates */}
        <Tooltip>
          <TooltipTrigger asChild>
            <TemplateManager
              trigger={
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <FileText className="h-4 w-4 mr-1" />
                  Templates
                </Button>
              }
            />
          </TooltipTrigger>
          <TooltipContent>Message Templates (Ctrl+T)</TooltipContent>
        </Tooltip>

        {/* Blast Messages */}
        <Tooltip>
          <TooltipTrigger asChild>
            <BlastMessageComposer
              trigger={
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <Send className="h-4 w-4 mr-1" />
                  Blast
                </Button>
              }
            />
          </TooltipTrigger>
          <TooltipContent>Blast Message (Ctrl+B)</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6" />

        {/* Bookmarks */}
        <Tooltip>
          <TooltipTrigger asChild>
            <BookmarkManager
              chatId={chatId}
              trigger={
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-2"
                >
                  <Bookmark className="h-4 w-4" />
                </Button>
              }
            />
          </TooltipTrigger>
          <TooltipContent>View Bookmarks</TooltipContent>
        </Tooltip>

        {/* Export */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2"
              onClick={handleQuickExport}
            >
              <Download className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Export Chat (Ctrl+E)</TooltipContent>
        </Tooltip>

        {/* Help */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2"
              onClick={handleShortcutsHelp}
            >
              <Keyboard className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Keyboard Shortcuts</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <ShortcutsHelp 
        open={showShortcuts} 
        onOpenChange={setShowShortcuts}
      />
    </div>
  );
};