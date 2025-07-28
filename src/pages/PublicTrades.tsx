import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, Bell, TrendingUp, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useChats } from "@/hooks/useChats";
import { formatDistanceToNow } from "date-fns";

export default function PublicTrades() {
  const navigate = useNavigate();
  const { chats, loading } = useChats();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterChain, setFilterChain] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");

  // Get public chats with trades
  const publicChats = chats.filter(chat => chat.isPublic && chat.trade);

  const filteredChats = publicChats
    .filter(chat => {
      const matchesSearch = chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          chat.trade?.pair.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesChain = filterChain === "all" || chat.trade?.chain === filterChain;
      const matchesType = filterType === "all" || chat.trade?.type === filterType;
      
      return matchesSearch && matchesChain && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
        case "size":
          return parseFloat(b.trade?.size || "0") - parseFloat(a.trade?.size || "0");
        default:
          return 0;
      }
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "completed": return "bg-blue-100 text-blue-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeColor = (type: string) => {
    return type === "buy" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Public Markets</h1>
          <Button size="sm" className="gap-2">
            <Bell className="h-4 w-4" />
            Create Alert
          </Button>
        </div>
        
        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search trades by pair or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto">
            <Select value={filterChain} onValueChange={setFilterChain}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Chain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Chains</SelectItem>
                <SelectItem value="ethereum">Ethereum</SelectItem>
                <SelectItem value="polygon">Polygon</SelectItem>
                <SelectItem value="bsc">BSC</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-24">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="sell">Sell</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="size">Size</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Trades List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20 md:pb-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading trades...
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No trades found matching your criteria
          </div>
        ) : (
          filteredChats.map((chat) => (
            <Card 
              key={chat.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/app?chat=${chat.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-semibold">{chat.trade?.pair}</h3>
                      <p className="text-sm text-muted-foreground">{chat.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={getTypeColor(chat.trade?.type || "")}>
                      {chat.trade?.type?.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Size</p>
                    <p className="font-semibold">{chat.trade?.size}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Price</p>
                    <p className="font-semibold">{chat.trade?.price}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Chain</p>
                    <p className="font-semibold">{chat.trade?.chain}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge variant="secondary" className={getStatusColor(chat.trade?.status || "")}>
                      {chat.trade?.status}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(chat.lastActivity, { addSuffix: true })}
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{chat.participants.length} participants</span>
                    {chat.unreadCount > 0 && (
                      <Badge variant="default" className="text-xs">
                        {chat.unreadCount}
                      </Badge>
                    )}
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