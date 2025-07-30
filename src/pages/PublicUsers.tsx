import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Star, TrendingUp, MessageCircle, UserPlus, UserCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReactSelect } from "@/components/ui/react-select";
import { LicenseBadges } from "@/components/ui/license-badges";
import { usePublicUsers, SortOption } from "@/hooks/usePublicUsers";
import { useLicenses } from "@/hooks/useLicenses";
import { useContacts } from "@/hooks/useContacts";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { useChats } from "@/hooks/useChats";
import { useToast } from "@/components/ui/use-toast";
import { formatDistanceToNow } from "date-fns";

export default function PublicUsers() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAuthenticated } = useWalletAuth();
  const {
    users,
    loading,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    kycFilter,
    setKycFilter,
    traderTypeFilter,
    setTraderTypeFilter,
    licenseFilter,
    setLicenseFilter,
    checkIsContact
  } = usePublicUsers();
  const { licenses } = useLicenses();
  const { addContact } = useContacts();
  const { isUserOnline } = useOnlinePresence();
  const { createChat, findExistingDirectChat } = useChats();
  const [contactStates, setContactStates] = useState<{ [userId: string]: boolean }>({});
  const [creatingChat, setCreatingChat] = useState<{ [userId: string]: boolean }>({});

  // Check contact status for all users
  useEffect(() => {
    const checkContactStatus = async () => {
      const states: { [userId: string]: boolean } = {};
      for (const user of users) {
        states[user.id] = await checkIsContact(user.id);
      }
      setContactStates(states);
    };

    if (users.length > 0) {
      checkContactStatus();
    }
  }, [users, checkIsContact]);

  const getReputationColor = (reputation: number) => {
    if (reputation >= 4.5) return "bg-green-100 text-green-800";
    if (reputation >= 3.5) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getSuccessRate = (successful: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((successful / total) * 100);
  };

  const getKycBadgeColor = (level: string) => {
    switch (level) {
      case 'Level 0': return "bg-gray-100 text-gray-800";
      case 'Level 1': return "bg-blue-100 text-blue-800";
      case 'Level 2': return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getTraderTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'Degen': return "bg-purple-100 text-purple-800";
      case 'Institutional': return "bg-indigo-100 text-indigo-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleAddContact = async (userId: string) => {
    const success = await addContact(userId);
    if (success) {
      setContactStates(prev => ({ ...prev, [userId]: true }));
    }
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
      console.log('Checking for existing chat with user:', userId, displayName);
      
      // First, check if a direct chat already exists with this user
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
        console.log('No existing chat found, creating new chat with user:', userId, displayName);
        
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
        <p className="text-muted-foreground mb-4">Please connect your wallet to discover users</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border p-4">
        <h1 className="text-2xl font-bold mb-4">Public Traders</h1>
        
        {/* Search and Sort */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search traders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-3 flex-wrap">
            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reputation">Reputation</SelectItem>
                <SelectItem value="trades">Total Trades</SelectItem>
                <SelectItem value="success">Success Rate</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={kycFilter} onValueChange={(value) => setKycFilter(value as typeof kycFilter)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="KYC Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All KYC</SelectItem>
                <SelectItem value="Level 0">Level 0</SelectItem>
                <SelectItem value="Level 1">Level 1</SelectItem>
                <SelectItem value="Level 2">Level 2</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={traderTypeFilter} onValueChange={(value) => setTraderTypeFilter(value as typeof traderTypeFilter)}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Trader Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Degen">Degen</SelectItem>
                <SelectItem value="Institutional">Institutional</SelectItem>
              </SelectContent>
            </Select>
            
            {licenseFilter.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {licenseFilter.map(licenseId => {
                  const license = licenses.find(l => l.id === licenseId);
                  return license ? (
                    <Badge key={licenseId} variant="secondary" className="text-xs">
                      {license.licenseName}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1"
                        onClick={() => setLicenseFilter(prev => prev.filter(id => id !== licenseId))}
                      >
                        ×
                      </Button>
                    </Badge>
                  ) : null;
                })}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setLicenseFilter([])}
                >
                  Clear all
                </Button>
              </div>
            )}
            
            <Select 
              value={licenseFilter.length > 0 ? "filtered" : "all"} 
              onValueChange={(value) => {
                if (value === "all") {
                  setLicenseFilter([]);
                } else if (value !== "filtered") {
                  setLicenseFilter(prev => prev.includes(value) ? prev : [...prev, value]);
                }
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Add license filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Licenses</SelectItem>
                {licenses.map(license => (
                  <SelectItem key={license.id} value={license.id}>
                    {license.region} - {license.licenseName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20 md:pb-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading users...
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No public traders found
          </div>
        ) : (
          users.map((user) => (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="relative">
                     <Avatar className="h-16 w-16">
                       <AvatarImage src={user.avatar} alt={user.displayName} />
                       <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
                     </Avatar>
                    {isUserOnline(user.id) && (
                      <div className="absolute bottom-0 right-0 h-4 w-4 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-2 mb-2 flex-wrap">
                       <h3 className="font-semibold text-lg">{user.displayName}</h3>
                       <Badge className={getReputationColor(user.reputation)}>
                         <Star className="h-3 w-3 mr-1" />
                         {user.reputation.toFixed(1)}
                       </Badge>
                        <Badge className={getKycBadgeColor(user.kycLevel)}>
                          KYC {user.kycLevel}
                        </Badge>
                       <Badge className={getTraderTypeBadgeColor(user.traderType)}>
                         {user.traderType}
                       </Badge>
                       {isUserOnline(user.id) && (
                         <Badge variant="secondary" className="text-green-600">
                           Online
                         </Badge>
                       )}
                     </div>
                    
                     {user.walletAddress && (
                       <div className="mb-2">
                         <a 
                           href={`https://etherscan.io/address/${user.walletAddress}`}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="font-mono text-xs text-primary hover:underline"
                         >
                           {user.walletAddress}
                         </a>
                       </div>
                     )}
                    
                     <p className="text-muted-foreground mb-2 text-sm">
                       {user.description || "No description provided"}
                     </p>

                     {user.licenses.length > 0 && (
                       <div className="mb-3">
                         <p className="text-xs text-muted-foreground mb-1">Licenses</p>
                         <LicenseBadges licenseIds={user.licenses} />
                       </div>
                     )}
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3 text-sm">
                       <div>
                         <p className="text-xs text-muted-foreground">Total Trades</p>
                         <p className="font-semibold">{user.totalTrades}</p>
                       </div>
                       <div>
                         <p className="text-xs text-muted-foreground">Success Rate</p>
                         <p className="font-semibold text-green-600">
                           {getSuccessRate(user.successfulTrades, user.totalTrades)}%
                         </p>
                       </div>
                       <div>
                         <p className="text-xs text-muted-foreground">Member Since</p>
                         <p className="font-semibold">
                           {formatDistanceToNow(user.joinedAt, { addSuffix: true })}
                         </p>
                       </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="gap-2"
                        onClick={() => handleMessage(user.id, user.displayName)}
                        disabled={creatingChat[user.id]}
                      >
                        {creatingChat[user.id] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MessageCircle className="h-4 w-4" />
                        )}
                        {creatingChat[user.id] ? "Creating..." : "Message"}
                      </Button>
                      <Button size="sm" variant="outline" className="gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Trade
                      </Button>
                      <Button 
                        size="sm" 
                        variant={contactStates[user.id] ? "secondary" : "outline"} 
                        className={contactStates[user.id] ? "" : "gap-2"}
                        onClick={() => !contactStates[user.id] && handleAddContact(user.id)}
                        disabled={contactStates[user.id]}
                      >
                        {contactStates[user.id] ? <UserCheck className="h-4 w-4 text-green-700" /> : <UserPlus className="h-4 w-4" />}
                        {contactStates[user.id] ? "" : "Add"}
                      </Button>
                    </div>
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