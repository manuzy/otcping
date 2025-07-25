import { useState } from "react";
import { Search, Star, TrendingUp, MessageCircle, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockUsers } from "@/data/mockData";
import { useWallet } from "@/hooks/useWallet";
import { formatDistanceToNow } from "date-fns";

export default function PublicUsers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("reputation");

  const { currentUser } = useWallet();

  // Filter public users (excluding current user)
  const publicUsers = mockUsers.filter(user => 
    user.isPublic && 
    user.id !== currentUser?.id &&
    user.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedUsers = publicUsers.sort((a, b) => {
    switch (sortBy) {
      case "reputation":
        return b.reputation - a.reputation;
      case "trades":
        return b.totalTrades - a.totalTrades;
      case "success":
        return (b.successfulTrades / Math.max(b.totalTrades, 1)) - (a.successfulTrades / Math.max(a.totalTrades, 1));
      case "newest":
        return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
      default:
        return 0;
    }
  });

  const getReputationColor = (reputation: number) => {
    if (reputation >= 4.5) return "bg-green-100 text-green-800";
    if (reputation >= 3.5) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getSuccessRate = (successful: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((successful / total) * 100);
  };

  const isContact = (userId: string) => currentUser?.contacts.includes(userId) || false;

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
          
          <Select value={sortBy} onValueChange={setSortBy}>
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
        </div>
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20 md:pb-4">
        {sortedUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No public traders found
          </div>
        ) : (
          sortedUsers.map((user) => (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={user.avatar} alt={user.displayName} />
                      <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {user.isOnline && (
                      <div className="absolute bottom-0 right-0 h-4 w-4 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{user.displayName}</h3>
                      <Badge className={getReputationColor(user.reputation)}>
                        <Star className="h-3 w-3 mr-1" />
                        {user.reputation.toFixed(1)}
                      </Badge>
                      {user.isOnline && (
                        <Badge variant="secondary" className="text-green-600">
                          Online
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-muted-foreground mb-3 text-sm">
                      {user.description || "No description provided"}
                    </p>
                    
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
                      <Button size="sm" variant="outline" className="gap-2">
                        <MessageCircle className="h-4 w-4" />
                        Message
                      </Button>
                      <Button size="sm" variant="outline" className="gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Trade
                      </Button>
                      <Button 
                        size="sm" 
                        variant={isContact(user.id) ? "secondary" : "outline"} 
                        className="gap-2"
                      >
                        <UserPlus className="h-4 w-4" />
                        {isContact(user.id) ? "Contact" : "Add"}
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