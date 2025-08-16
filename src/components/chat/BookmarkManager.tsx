import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bookmark, Trash2, Edit, Search, Filter, ExternalLink } from "lucide-react";
import { useMessageBookmarks } from "@/hooks/useMessageBookmarks";
import { format } from 'date-fns';

interface BookmarkManagerProps {
  chatId?: string;
  trigger?: React.ReactNode;
}

export const BookmarkManager = ({ chatId, trigger }: BookmarkManagerProps) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [editingBookmark, setEditingBookmark] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const { 
    bookmarks, 
    loading, 
    updateBookmark, 
    removeBookmark, 
    getBookmarkCategories 
  } = useMessageBookmarks(chatId);

  const categories = getBookmarkCategories();
  const filteredBookmarks = bookmarks.filter(bookmark => {
    const matchesSearch = bookmark.messageContent.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bookmark.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bookmark.senderName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || bookmark.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleEdit = (bookmark: any) => {
    setEditingBookmark(bookmark.id);
    setEditCategory(bookmark.category || "");
    setEditNotes(bookmark.notes || "");
  };

  const handleSaveEdit = async () => {
    if (!editingBookmark) return;
    
    await updateBookmark(editingBookmark, {
      category: editCategory,
      notes: editNotes
    });
    
    setEditingBookmark(null);
    setEditCategory("");
    setEditNotes("");
  };

  const handleDelete = async (bookmarkId: string) => {
    if (confirm("Are you sure you want to remove this bookmark?")) {
      await removeBookmark(bookmarkId);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'general': 'bg-blue-100 text-blue-800',
      'important': 'bg-red-100 text-red-800',
      'follow-up': 'bg-yellow-100 text-yellow-800',
      'reference': 'bg-green-100 text-green-800',
      'archive': 'bg-gray-100 text-gray-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Bookmark className="h-4 w-4" />
            Bookmarks
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Message Bookmarks</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Search bookmarks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Statistics */}
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>Total: {bookmarks.length}</span>
            <span>Filtered: {filteredBookmarks.length}</span>
            <span>Categories: {categories.length}</span>
          </div>

          <Separator />

          {/* Bookmarks List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading bookmarks...
              </div>
            ) : filteredBookmarks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm || selectedCategory !== "all" 
                  ? "No bookmarks match your search criteria"
                  : "No bookmarks found"
                }
              </div>
            ) : (
              filteredBookmarks.map(bookmark => (
                <Card key={bookmark.id} className="p-4">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={getCategoryColor(bookmark.category || 'general')}>
                          {bookmark.category || 'general'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          from {bookmark.senderName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(bookmark.messageTimestamp, 'MMM d, yyyy HH:mm')}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(bookmark)}
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(bookmark.id)}
                          className="h-6 w-6 p-0 text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Message Content */}
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm">{bookmark.messageContent}</p>
                    </div>

                    {/* Notes */}
                    {bookmark.notes && (
                      <div className="text-sm text-muted-foreground">
                        <strong>Notes:</strong> {bookmark.notes}
                      </div>
                    )}

                    {/* Edit Form */}
                    {editingBookmark === bookmark.id && (
                      <div className="space-y-3 border-t pt-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="category">Category</Label>
                            <Input
                              id="category"
                              value={editCategory}
                              onChange={(e) => setEditCategory(e.target.value)}
                              placeholder="Category"
                            />
                          </div>
                          <div className="flex items-end gap-2">
                            <Button onClick={handleSaveEdit} size="sm">
                              Save
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setEditingBookmark(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="notes">Notes</Label>
                          <Textarea
                            id="notes"
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            placeholder="Add notes..."
                            rows={3}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};