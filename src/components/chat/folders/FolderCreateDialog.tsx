import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useChatFolders } from "@/hooks/useChatFolders";

interface FolderCreateDialogProps {
  children?: React.ReactNode;
}

const colorOptions = [
  { value: 'oklch(0.67 0.17 153.85)', label: 'Green', class: 'bg-primary' },
  { value: 'oklch(0.55 0.18 235)', label: 'Blue', class: 'bg-blue-500' },
  { value: 'oklch(0.61 0.24 20.96)', label: 'Red', class: 'bg-red-500' },
  { value: 'oklch(0.75 0.15 70)', label: 'Orange', class: 'bg-orange-500' },
  { value: 'oklch(0.60 0.15 300)', label: 'Purple', class: 'bg-purple-500' },
  { value: 'oklch(0.65 0.15 140)', label: 'Emerald', class: 'bg-emerald-500' },
];

export const FolderCreateDialog = ({ children }: FolderCreateDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(colorOptions[0].value);
  const [isCreating, setIsCreating] = useState(false);
  const { createFolder } = useChatFolders();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      const folder = await createFolder(name.trim(), selectedColor);
      if (folder) {
        setOpen(false);
        setName("");
        setSelectedColor(colorOptions[0].value);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const trigger = children || (
    <Button variant="ghost" size="icon" className="h-6 w-6">
      <Plus className="h-3 w-3" />
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
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
          
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="grid grid-cols-6 gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setSelectedColor(color.value)}
                  className={`
                    w-8 h-8 rounded-full border-2 transition-all
                    ${selectedColor === color.value 
                      ? 'border-foreground scale-110' 
                      : 'border-border hover:scale-105'
                    }
                    ${color.class}
                  `}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!name.trim() || isCreating}
            >
              {isCreating ? "Creating..." : "Create Folder"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};