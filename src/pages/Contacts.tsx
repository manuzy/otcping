import { useState } from "react";
import { Search, UserPlus, MessageCircle, TrendingUp, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useContacts } from "@/hooks/useContacts";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { useChats } from "@/hooks/useChats";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function Contacts() {
  const [searchQuery, setSearchQuery] = useState("");
  const [creatingChat, setCreatingChat] = useState<{ [userId: string]: boolean }>({});
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated } = useWalletAuth();
  const { contacts, loading, removeContact } = useContacts();
  const { isUserOnline } = useOnlinePresence();
  const { createChat, findExistingDirectChat } = useChats();
  
  // Filter contacts based on search query
  const filteredContacts = contacts.filter(contact => 
    contact.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getReputationColor = (reputation: number) => {
    if (reputation >= 4.5) return "bg-green-100 text-green-800";
    if (reputation >= 3.5) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const handleMessage = async (userId: string, displayName: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please connect your wallet to send messages",
        variant: "destructive",
      });
      return;
    }

    // Prevent multiple simultaneous chat creation attempts
    if (creatingChat[userId]) {
      return;
    }

    setCreatingChat(prev => ({ ...prev, [userId]: true }));

    try {
      console.log('Checking for existing chat with contact:', userId, displayName);
      
      // First, check if a direct chat already exists with this contact
      const existingChat = await findExistingDirectChat(userId);
      
      if (existingChat) {
        console.log('Found existing chat:', existingChat.id);
        // Navigate to existing chat
        navigate(`/app?chat=${existingChat.id}`);
        toast({
          title: "Existing Chat Found",
          description: `Redirected to your existing chat with ${displayName}.`,
        });
      } else {
        console.log('No existing chat found, creating new chat with contact:', userId, displayName);
        
        // Create a new direct message chat
        const chatId = await createChat(`Chat with ${displayName}`, false, undefined, [userId]);
        
        if (chatId) {
          console.log('Chat created successfully, navigating to:', chatId);
          navigate(`/app?chat=${chatId}`);
          toast({
            title: "Chat Created",
            description: `Started a new chat with ${displayName}.`,
          });
        } else {
          console.error('Chat creation returned null');
        }
      }
    } catch (error) {
      console.error('Error in handleMessage:', error);
      toast({
        title: "Error",
        description: "Failed to create or find chat. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreatingChat(prev => ({ ...prev, [userId]: false }));
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-muted-foreground mb-4">Please connect your wallet to view contacts</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">My Contacts</h1>
          <Button size="sm" className="gap-2" onClick={() => navigate('/users')}>
            <UserPlus className="h-4 w-4" />
            Find Users
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20 md:pb-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading contacts...
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? "No contacts found" : "No contacts yet. Start by finding users to add!"}
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <Card key={contact.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={contact.avatar} alt={contact.display_name} />
                      <AvatarFallback>{contact.display_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {isUserOnline(contact.id) && (
                      <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{contact.display_name}</h3>
                      <Badge variant="secondary" className={getReputationColor(contact.reputation)}>
                        ⭐ {contact.reputation.toFixed(1)}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground truncate mb-2">
                      {contact.description || "No description"}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{contact.successful_trades}/{contact.total_trades} trades</span>
                      <span className={isUserOnline(contact.id) ? "text-green-600" : ""}>
                        {isUserOnline(contact.id) ? "Online" : "Offline"}
                      </span>
                    </div>
                  </div>
                  
                   <div className="flex gap-2">
                     <Button 
                       size="sm" 
                       variant="outline" 
                       className="gap-1"
                       onClick={() => handleMessage(contact.id, contact.display_name)}
                       disabled={creatingChat[contact.id]}
                     >
                       {creatingChat[contact.id] ? (
                         <Loader2 className="h-4 w-4 animate-spin" />
                       ) : (
                         <MessageCircle className="h-4 w-4" />
                       )}
                     </Button>
                    <Button size="sm" variant="outline" className="gap-1">
                      <TrendingUp className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="gap-1 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Contact</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove {contact.display_name} from your contacts?
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => removeContact(contact.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}