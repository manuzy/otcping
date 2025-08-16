import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChatFolder } from "@/types/chat";
import { useChatFolders } from "@/hooks/useChatFolders";

interface FolderRenameDialogProps {
  folder: ChatFolder;
  open: boolean;
  onClose: () => void;
}

export const FolderRenameDialog = ({ folder, open, onClose }: FolderRenameDialogProps) => {
  const [name, setName] = useState(folder.name);
  const [isUpdating, setIsUpdating] = useState(false);
  const { updateFolder } = useChatFolders();

  useEffect(() => {
    if (open) {
      setName(folder.name);
    }
  }, [open, folder.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim() === folder.name) {
      onClose();
      return;
    }

    setIsUpdating(true);
    try {
      const success = await updateFolder(folder.id, { name: name.trim() });
      if (success) {
        onClose();
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rename Folder</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter folder name..."
              autoFocus
              maxLength={50}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!name.trim() || name.trim() === folder.name || isUpdating}
            >
              {isUpdating ? "Updating..." : "Update"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};