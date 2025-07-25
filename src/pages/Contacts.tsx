import { useState } from "react";
import { Search, UserPlus, MessageCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { mockUsers } from "@/data/mockData";
import { useAppKitAccount } from '@reown/appkit/react';
import { User } from "@/types";

export default function Contacts() {
  const [searchQuery, setSearchQuery] = useState("");
  const { address } = useAppKitAccount();
  
  // Filter users that are in current user's contacts (simplified for now)
  const contacts = mockUsers.filter(user => 
    user.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getReputationColor = (reputation: number) => {
    if (reputation >= 4.5) return "bg-green-100 text-green-800";
    if (reputation >= 3.5) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">My Contacts</h1>
          <Button size="sm" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Add Contact
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
        {contacts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? "No contacts found" : "No contacts yet"}
          </div>
        ) : (
          contacts.map((contact) => (
            <Card key={contact.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={contact.avatar} alt={contact.displayName} />
                      <AvatarFallback>{contact.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {contact.isOnline && (
                      <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{contact.displayName}</h3>
                      <Badge variant="secondary" className={getReputationColor(contact.reputation)}>
                        ⭐ {contact.reputation.toFixed(1)}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground truncate mb-2">
                      {contact.description || "No description"}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{contact.successfulTrades}/{contact.totalTrades} trades</span>
                      <span className={contact.isOnline ? "text-green-600" : ""}>
                        {contact.isOnline ? "Online" : "Offline"}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1">
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1">
                      <TrendingUp className="h-4 w-4" />
                    </Button>
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