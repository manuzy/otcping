import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Keyboard } from "lucide-react";

interface ShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ShortcutsHelp = ({ open, onOpenChange }: ShortcutsHelpProps) => {
  const shortcuts = [
    { keys: ["Ctrl", "T"], description: "Open Template Manager" },
    { keys: ["Ctrl", "S"], description: "Schedule Message" },
    { keys: ["Ctrl", "B"], description: "Blast Message Composer" },
    { keys: ["Ctrl", "E"], description: "Export Chat" },
    { keys: ["Ctrl", "K"], description: "Global Search" },
    { keys: ["Enter"], description: "Send Message" },
    { keys: ["Shift", "Enter"], description: "New Line" },
    { keys: ["Escape"], description: "Cancel Reply" },
    { keys: ["Ctrl", "B"], description: "Bold Text (in input)" },
    { keys: ["Ctrl", "I"], description: "Italic Text (in input)" },
    { keys: ["Ctrl", "`"], description: "Code Text (in input)" },
    { keys: ["@"], description: "Mention User" },
    { keys: ["#"], description: "Add Hashtag" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Use these shortcuts to boost your productivity:
          </div>
          
          <div className="space-y-3">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, keyIndex) => (
                    <span key={keyIndex} className="flex items-center">
                      <Badge variant="outline" className="px-2 py-0.5 text-xs font-mono">
                        {key}
                      </Badge>
                      {keyIndex < shortcut.keys.length - 1 && (
                        <span className="mx-1 text-muted-foreground">+</span>
                      )}
                    </span>
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {shortcut.description}
                </span>
              </div>
            ))}
          </div>
          
          <Separator />
          
          <div className="text-xs text-muted-foreground">
            Press <Badge variant="outline" className="px-1 py-0.5 text-xs">?</Badge> while holding <Badge variant="outline" className="px-1 py-0.5 text-xs">Ctrl</Badge> to show this help anytime.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};