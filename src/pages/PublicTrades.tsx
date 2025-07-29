import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, Bell, TrendingUp, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { useChats } from "@/hooks/useChats";
import { useTokens } from "@/hooks/useTokens";
import { useChains } from "@/hooks/useChains";
import { formatDistanceToNow, format } from "date-fns";
import { formatNumberWithCommas } from "@/lib/utils";
import { getExplorerUrl } from "@/lib/tokenUtils";


// Date utility function
function safeParseDate(dateValue: string | Date | null | undefined): Date | null {
  if (!dateValue) return null;
  
  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? null : dateValue;
  }
  
  try {
    const parsedDate = new Date(dateValue);
    return isNaN(parsedDate.getTime()) ? null : parsedDate;
  } catch {
    return null;
  }
}

export default function PublicTrades() {
  const navigate = useNavigate();
  const { chats, loading } = useChats();
  const { chains } = useChains();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterChain, setFilterChain] = useState<string>("all");
  const [filterToken, setFilterToken] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  
  const selectedChainId = filterChain === "all" ? undefined : parseInt(filterChain);
  const { tokens } = useTokens(selectedChainId);

  // Helper function to find token by address
  const findToken = (address: string) => {
    return tokens.find(token => token.address.toLowerCase() === address.toLowerCase());
  };

  // Create token options for the combobox
  const tokenOptions: ComboboxOption[] = [
    { value: "all", label: "All Tokens" },
    ...tokens.map(token => ({
      value: token.address.toLowerCase(),
      label: `${token.name} (${token.symbol}) - ${token.address.slice(0, 8)}...`
    }))
  ];

  // Helper function to format trade pair with token symbols only
  const formatTradePair = (sellAsset: string, buyAsset: string) => {
    const sellToken = findToken(sellAsset);
    const buyToken = findToken(buyAsset);
    
    if (sellToken && buyToken) {
      return `${sellToken.symbol}/${buyToken.symbol}`;
    }
    return `${sellAsset}/${buyAsset}`;
  };

  // Get public chats with trades
  const publicChats = chats.filter(chat => chat.isPublic && chat.trade);

  const filteredChats = publicChats
    .filter(chat => {
      const matchesSearch = chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          chat.trade?.pair.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesChain = filterChain === "all" || chat.trade?.chain_id?.toString() === filterChain;
      
      // Token filtering logic combined with buy/sell type
      let matchesToken = filterToken === "all";
      if (!matchesToken && chat.trade) {
        const selectedTokenAddress = filterToken.toLowerCase();
        
        if (filterType === "buy") {
          // Only check buy asset when "buy" is selected
          matchesToken = chat.trade.buyAsset?.toLowerCase() === selectedTokenAddress;
        } else if (filterType === "sell") {
          // Only check sell asset when "sell" is selected
          matchesToken = chat.trade.sellAsset?.toLowerCase() === selectedTokenAddress;
        } else {
          // Check both buy and sell assets when "all" is selected
          matchesToken = chat.trade.buyAsset?.toLowerCase() === selectedTokenAddress ||
                        chat.trade.sellAsset?.toLowerCase() === selectedTokenAddress;
        }
      }
      
      const matchesType = filterType === "all" || chat.trade?.type === filterType;
      
      return matchesSearch && matchesChain && matchesToken && matchesType;
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
            <Select value={filterChain} onValueChange={(value) => {
              setFilterChain(value);
              setFilterToken("all"); // Reset token filter when chain changes
            }}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Chain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Chains</SelectItem>
                {chains.map((chain) => (
                  <SelectItem key={chain.id} value={chain.chain_id.toString()}>
                    {chain.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Combobox
              options={tokenOptions}
              value={filterToken}
              onValueChange={(value) => setFilterToken(value || "all")}
              placeholder="Select token..."
              searchPlaceholder="Search tokens..."
              className="w-48"
            />
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
                      <h3 className="font-semibold">
                        {chat.trade?.sellAsset && chat.trade?.buyAsset 
                          ? formatTradePair(chat.trade.sellAsset, chat.trade.buyAsset)
                          : chat.trade?.pair
                        }
                        {chat.trade?.chain && (
                          <span className="text-muted-foreground"> on {chat.trade.chain}</span>
                        )}
                      </h3>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Sell Token */}
                  {chat.trade?.sellAsset && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">SELL</p>
                      {(() => {
                        const sellToken = findToken(chat.trade.sellAsset);
                        if (sellToken) {
                          return (
                            <div className="flex flex-col gap-1">
                              <span className="font-semibold">{sellToken.name} ({sellToken.symbol})</span>
                              <a 
                                href={getExplorerUrl(sellToken.chain_id, sellToken.address)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {sellToken.address}
                              </a>
                            </div>
                          );
                        }
                        return <span className="font-semibold">{chat.trade.sellAsset}</span>;
                      })()}
                    </div>
                  )}
                  
                  {/* Buy Token */}
                  {chat.trade?.buyAsset && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">BUY</p>
                      {(() => {
                        const buyToken = findToken(chat.trade.buyAsset);
                        if (buyToken) {
                          return (
                            <div className="flex flex-col gap-1">
                              <span className="font-semibold">{buyToken.name} ({buyToken.symbol})</span>
                              <a 
                                href={getExplorerUrl(buyToken.chain_id, buyToken.address)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {buyToken.address}
                              </a>
                            </div>
                          );
                        }
                        return <span className="font-semibold">{chat.trade.buyAsset}</span>;
                      })()}
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">USD Amount</p>
                    <p className="font-semibold">
                      ${formatNumberWithCommas(chat.trade?.usdAmount || chat.trade?.size || "0")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Limit Price</p>
                    <p className="font-semibold">
                      ${formatNumberWithCommas(chat.trade?.limitPrice || chat.trade?.price || "0")}
                    </p>
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

                {/* Additional trade information */}
                <div className="space-y-2 mb-3">
                  {chat.trade?.expiryTimestamp && safeParseDate(chat.trade.expiryTimestamp) && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Expires: {format(safeParseDate(chat.trade.expiryTimestamp)!, "dd/MM/yyyy, HH:mm:ss")}</span>
                    </div>
                  )}
                  
                  {chat.trade?.expectedExecution && safeParseDate(chat.trade.expectedExecution) && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      <span>Expected execution: {format(safeParseDate(chat.trade.expectedExecution)!, "dd/MM/yyyy, HH:mm:ss")}</span>
                    </div>
                  )}
                  
                  {chat.trade?.triggerAsset && chat.trade?.triggerCondition && chat.trade?.triggerPrice && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>🔔 Triggers if {(() => {
                        const triggerToken = findToken(chat.trade.triggerAsset);
                        return triggerToken ? `${triggerToken.name} (${triggerToken.symbol})` : chat.trade.triggerAsset;
                      })()} price is {chat.trade.triggerCondition} ${formatNumberWithCommas(chat.trade.triggerPrice)}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Created: {formatDistanceToNow(chat.lastActivity, { addSuffix: true })}</span>
                  </div>
                  <div className="flex items-center gap-2">
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