import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ReactSelect } from "@/components/ui/react-select";
import { ArrowLeft, Check } from "lucide-react";
import { useAppKitAccount } from '@reown/appkit/react';
import { useContacts } from "@/hooks/useContacts";
import { useChats } from "@/hooks/useChats";
import { notifications } from "@/lib/notifications";
import { logger } from "@/lib/logger";
import { useAuth } from "@/hooks/useAuth";
import { useChains } from "@/hooks/useChains";
import { useTokens } from "@/hooks/useTokens";
import { tokenToSelectOption, tokenToTriggerSelectOption, getExplorerUrl, formatTokenDisplay, truncateAddress } from "@/lib/tokenUtils";
import { supabase } from "@/integrations/supabase/client";
import { formatNumberWithCommas, parseFormattedNumber, isValidNumberInput } from "@/lib/utils";
import { ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCoinMarketCapPrice } from "@/hooks/useCoinMarketCapPrice";


interface TradeFormData {
  chain_id: string;
  sellAsset: string; // Token address
  buyAsset: string;  // Token address
  usdAmount: string;
  tokenAmount: string;
  limitPrice: string;
  expectedExecutionTimestamp: string;
  expiryType: string;
  expiryValue: string;
  triggerAsset: string;
  triggerCondition: string;
  triggerPrice: string;
}

const CreateTrade = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { address } = useAppKitAccount();
  const { user } = useAuth();
  const { contacts, loading: contactsLoading, addContact } = useContacts();
  const { createChat } = useChats();
  const { chains, loading: chainsLoading, error: chainsError } = useChains();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isPublicChat, setIsPublicChat] = useState(true);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [preSelectedUser, setPreSelectedUser] = useState<{id: string, name: string} | null>(null);
  const [hasProcessedParams, setHasProcessedParams] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [formData, setFormData] = useState<TradeFormData>({
    chain_id: "",
    sellAsset: "",
    buyAsset: "",
    usdAmount: "",
    tokenAmount: "",
    limitPrice: "",
    expectedExecutionTimestamp: "",
    expiryType: "",
    expiryValue: "",
    triggerAsset: "",
    triggerCondition: "",
    triggerPrice: ""
  });

  // Get selected chain ID for token filtering
  const selectedChainId = formData.chain_id ? parseInt(chains.find(c => c.id === formData.chain_id)?.chain_id.toString() || '0') : undefined;
  const { tokens, loading: tokensLoading, error: tokensError } = useTokens(selectedChainId);

  // Get price for sell token conversion (only when both token and chain are selected)
  const shouldFetchPrice = formData.sellAsset && selectedChainId;
  const { 
    price, 
    loading: priceLoading, 
    error: priceError, 
    refreshPrice, 
    convertUSDToToken 
  } = useCoinMarketCapPrice(
    shouldFetchPrice ? formData.sellAsset : "", 
    shouldFetchPrice ? selectedChainId : 0
  );

  // Handle URL parameters for pre-selected user
  useEffect(() => {
    const userId = searchParams.get('user');
    const userName = searchParams.get('userName');
    
    if (userId && userName && !hasProcessedParams) {
      setHasProcessedParams(true);
      setPreSelectedUser({ id: userId, name: decodeURIComponent(userName) });
      setIsPublicChat(false);
      setSelectedContacts([userId]);
      
      // Only add as contact if contacts are loaded and user isn't already a contact
      if (!contactsLoading && contacts.length > 0) {
        const isAlreadyContact = contacts.some(contact => contact.id === userId);
        if (!isAlreadyContact) {
          addContact(userId).catch((error) => {
            // Only show error if it's not a duplicate key error
            if (!error.message?.includes('duplicate key')) {
              notifications.error({
                title: "Error",
                description: "Failed to add contact. Please try again."
              });
            }
          });
        }
      }
    }
  }, [searchParams, hasProcessedParams, contactsLoading, contacts, addContact]);

  const handleInputChange = (field: keyof TradeFormData, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Reset token selections when chain changes
      if (field === 'chain_id') {
        newData.sellAsset = '';
        newData.buyAsset = '';
        newData.tokenAmount = '';
      }
      
      // Reset token amount when sell token changes
      if (field === 'sellAsset') {
        newData.tokenAmount = '';
      }
      
      return newData;
    });
  };

  const handleNumberInputChange = (field: 'usdAmount' | 'limitPrice' | 'triggerPrice', value: string) => {
    if (!isValidNumberInput(value)) return;
    
    const cleanValue = parseFormattedNumber(value);
    const newFormData = { ...formData, [field]: cleanValue };
    
    // Auto-calculate token amount when USD amount changes
    if (field === 'usdAmount' && price) {
      newFormData.tokenAmount = convertUSDToToken(cleanValue);
    }
    
    setFormData(prev => ({ ...prev, ...newFormData }));
  };

  const handleContactToggle = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleNext = () => {
    if (preSelectedUser && currentStep === 1) {
      // Skip chat configuration step when counterparty is pre-selected
      setCurrentStep(3);
    } else if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (preSelectedUser && currentStep === 3) {
      // Skip back to trade details when counterparty is pre-selected
      setCurrentStep(1);
    } else if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate("/app");
    }
  };

  const handlePublish = async () => {
    if (!user?.id) {
      notifications.authError();
      return;
    }
    
    setIsPublishing(true);
    
    try {
      // Find the selected chain name for storage
      const selectedChain = chains.find(c => c.id === formData.chain_id);
      if (!selectedChain) {
        throw new Error("Selected chain not found");
      }

      // Find the selected tokens for display names
      const sellToken = tokens.find(t => t.address === formData.sellAsset);
      const buyToken = tokens.find(t => t.address === formData.buyAsset);
      
      // Calculate expiry timestamp
      let expiryTimestamp = null;
      
      logger.debug('Calculating trade expiry timestamp', {
        component: 'CreateTrade',
        operation: 'publish_trade',
        metadata: {
          expiryType: formData.expiryType,
          expiryValue: formData.expiryValue,
          currentTime: new Date().toISOString()
        }
      });
      
      if (formData.expiryType !== "Never") {
        const now = new Date();
        if (formData.expiryType === "Custom" && formData.expiryValue) {
          // For custom, assume the value is in hours
          const customHours = parseInt(formData.expiryValue);
          if (!isNaN(customHours) && customHours > 0) {
            expiryTimestamp = new Date(now.getTime() + customHours * 60 * 60 * 1000).toISOString();
            logger.debug('Custom expiry calculated', {
              component: 'CreateTrade',
              operation: 'publish_trade',
              metadata: { customHours, expiryTimestamp }
            });
          } else {
            logger.warn('Invalid custom expiry value, defaulting to 24 hours', {
              component: 'CreateTrade',
              operation: 'publish_trade',
              metadata: { invalidValue: formData.expiryValue }
            });
            // Default to 24 hours if custom value is invalid
            expiryTimestamp = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
          }
        } else {
          const hours = {
            '1 hour': 1,
            '1 day': 24,
            '1 week': 168,
            '1 month': 720
          }[formData.expiryType] || 24; // Default to 24 hours instead of 0
          expiryTimestamp = new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
          logger.debug('Preset expiry calculated', {
            component: 'CreateTrade',
            operation: 'publish_trade',
            metadata: { expiryType: formData.expiryType, hours, expiryTimestamp }
          });
        }
        } else {
          logger.debug('No expiry set (Never)', {
            component: 'CreateTrade',
            operation: 'publish_trade'
          });
        }

      // Create the trade first
      const { data: tradeData, error: tradeError } = await supabase
        .from('trades')
        .insert({
          chain: selectedChain.name,
          pair: `${sellToken?.symbol || formData.sellAsset}/${buyToken?.symbol || formData.buyAsset}`,
          size: formData.usdAmount,
          price: formData.limitPrice || "Market",
          type: "sell",
          status: "active",
          created_by: user.id,
          limit_price: formData.limitPrice,
          usd_amount: formData.usdAmount,
          token_amount: formData.tokenAmount,
          sell_asset: formData.sellAsset,
          buy_asset: formData.buyAsset,
          expected_execution: formData.expectedExecutionTimestamp || null,
          expiry_type: formData.expiryType,
          expiry_timestamp: expiryTimestamp,
          trigger_asset: formData.triggerAsset,
          trigger_condition: formData.triggerCondition,
          trigger_price: formData.triggerPrice
        })
        .select()
        .single();

      if (tradeError) throw tradeError;

      if (isPublicChat) {
        // For public trades, just create the trade - no chat created
        notifications.success({
          title: "Trade Created",
          description: "Your trade has been published to the public market!"
        });

        // Navigate to public trades page
        navigate("/public-trades");
      } else {
        // For private trades, create individual 1-1 chats with each selected contact
        const chatCreationPromises = selectedContacts.map(async (contactId) => {
          // Get contact profile for chat name
          const { data: contactProfile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', contactId)
            .single();

          const contactName = contactProfile?.display_name || 'Contact';
          const chatName = `Trade Discussion with ${contactName}`;
          
          const chatId = await createChat(chatName, false, tradeData.id, [contactId]);
          
          if (chatId) {
            // Send automated message to each chat
            await supabase
              .from('messages')
              .insert({
                chat_id: chatId,
                sender_id: user.id,
                content: `Hi ${contactName}, looking for a counterpart fulfilling my trade. See more info above`,
                type: 'system'
              });
          }
          
          return chatId;
        });

        await Promise.all(chatCreationPromises);

        notifications.success({
          title: "Trade Created",
          description: `Your private trade has been shared with ${selectedContacts.length} contact(s)!`
        });

        // Navigate to chats page
        navigate("/app");
      }
    } catch (error) {
      logger.error('Failed to create trade', {
        component: 'CreateTrade',
        operation: 'publish_trade',
        metadata: { isPublic: isPublicChat }
      }, error as Error);
      notifications.error({
        title: "Error",
        description: "Failed to create trade. Please try again."
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const isStep1Valid = formData.chain_id && formData.sellAsset && formData.buyAsset && formData.usdAmount && formData.limitPrice;

  // Prepare chain options
  const chainOptions = chains.map(chain => ({
    label: chain.name,
    value: chain.id
  }));

  // Prepare token options
  const tokenOptions = tokens.map(tokenToSelectOption);

  // Prepare trigger token options (only sell and buy tokens)
  const triggerTokenOptions = (() => {
    if (!formData.sellAsset || !formData.buyAsset) return [];
    
    const sellToken = tokens.find(t => t.address === formData.sellAsset);
    const buyToken = tokens.find(t => t.address === formData.buyAsset);
    
    const options = [];
    if (sellToken) options.push(tokenToTriggerSelectOption(sellToken));
    if (buyToken) options.push(tokenToTriggerSelectOption(buyToken));
    
    return options;
  })();

  // Token loading state or empty state
  const getTokenSelectPlaceholder = () => {
    if (!formData.chain_id) return "Select a chain first";
    if (tokensLoading) return "Loading tokens...";
    if (tokensError) return "Error loading tokens";
    if (tokens.length === 0) return "No tokens available for this chain";
    return "Select token";
  };

  // Helper function to calculate expiry timestamp
  const calculateExpiry = (type: string, customValue?: string) => {
    if (type === "Custom" && customValue) {
      return new Date(customValue).toISOString();
    }
    
    const now = new Date();
    switch (type) {
      case "1 hour": return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
      case "1 day": return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      case "3 days": return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
      case "7 days": return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      case "28 days": return new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000).toISOString();
      default: return "";
    }
  };

  // Helper function to get current datetime in local format for min attribute
  const getCurrentDateTimeLocal = () => {
    return new Date().toISOString().slice(0, 16);
  };

  // Helper function to format expiry display
  const formatExpiryDisplay = () => {
    if (formData.expiryType === "Custom" && formData.expiryValue) {
      return new Date(formData.expiryValue).toLocaleString();
    }
    if (formData.expiryType && formData.expiryType !== "Custom") {
      const expiryTime = calculateExpiry(formData.expiryType);
      return expiryTime ? new Date(expiryTime).toLocaleString() : formData.expiryType;
    }
    return "";
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container-narrow">
        {/* Header */}
        <div className="flex-gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Create New Trade</h1>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {(preSelectedUser ? [1, 3] : [1, 2, 3]).map((step, index) => (
            <div key={step} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${currentStep >= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
              `}>
                {currentStep > step ? <Check className="h-4 w-4" /> : (preSelectedUser ? index + 1 : step)}
              </div>
              {index < (preSelectedUser ? 1 : 2) && (
                <div className={`
                  w-16 h-1 mx-2
                  ${currentStep > step ? 'bg-primary' : 'bg-muted'}
                `} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle>
              {currentStep === 1 && "Trade Details"}
              {currentStep === 2 && "Chat Configuration"}
              {currentStep === 3 && (preSelectedUser ? "Review & Publish" : "Review & Publish")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Pre-selected user banner */}
            {preSelectedUser && currentStep === 1 && (
              <div className="bg-muted p-4 rounded-lg mb-6">
                <h3 className="font-medium">Creating Private Trade</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This trade will be shared privately with {preSelectedUser.name}
                </p>
              </div>
            )}

            {/* Step 1: Trade Details */}
            {currentStep === 1 && (
              <>
                <div className="space-y-2 relative z-[100]">
                  <Label>Chain *</Label>
                  {chainsError && (
                    <p className="text-sm text-destructive">Error loading chains: {chainsError}</p>
                  )}
                  <div className="w-full">
                    <ReactSelect
                      options={chainOptions}
                      value={formData.chain_id}
                      onValueChange={(value) => handleInputChange("chain_id", value || "")}
                      placeholder="Select blockchain"
                      disabled={chainsLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2 relative z-[99]">
                  <Label>Sell token *</Label>
                  {tokensError && (
                    <p className="text-sm text-destructive">Error loading tokens: {tokensError}</p>
                  )}
                  <div className="w-full">
                    <ReactSelect
                      options={tokenOptions}
                      value={formData.sellAsset}
                      onValueChange={(value) => handleInputChange("sellAsset", value || "")}
                      placeholder={getTokenSelectPlaceholder()}
                      disabled={!formData.chain_id || tokensLoading}
                      getExplorerUrl={(token) => getExplorerUrl(token.chain_id, token.address)}
                    />
                  </div>
                </div>

                <div className="space-y-2 relative z-[98]">
                  <Label>Buy token *</Label>
                  {tokensError && (
                    <p className="text-sm text-destructive">Error loading tokens: {tokensError}</p>
                  )}
                  <div className="w-full">
                    <ReactSelect
                      options={tokenOptions}
                      value={formData.buyAsset}
                      onValueChange={(value) => handleInputChange("buyAsset", value || "")}
                      placeholder={getTokenSelectPlaceholder()}
                      disabled={!formData.chain_id || tokensLoading}
                      getExplorerUrl={(token) => getExplorerUrl(token.chain_id, token.address)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>USD amount *</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="$ 0.00"
                      value={formatNumberWithCommas(formData.usdAmount)}
                      onChange={(e) => handleNumberInputChange("usdAmount", e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Token amount</Label>
                      {formData.sellAsset && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={refreshPrice}
                          disabled={priceLoading}
                          className="h-6 w-6 p-0"
                        >
                          <RefreshCw className={`h-3 w-3 ${priceLoading ? 'animate-spin' : ''}`} />
                        </Button>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        type="text"
                        value={formData.tokenAmount}
                        placeholder={
                          !formData.sellAsset ? "Select sell token first" :
                          priceLoading ? "Loading price..." :
                          priceError ? "Price unavailable" :
                          !price ? "Enter USD amount" :
                          "0.00"
                        }
                        disabled={true}
                        className="bg-muted"
                      />
                      {price && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                          {price.symbol}
                        </div>
                      )}
                    </div>
                    {priceError && (
                      <p className="text-xs text-destructive">{priceError}</p>
                    )}
                    {price && (
                      <p className="text-xs text-muted-foreground">
                        1 {price.symbol} = ${price.priceUSD.toFixed(6)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Limit price *</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="$ 0.00"
                    value={formatNumberWithCommas(formData.limitPrice)}
                    onChange={(e) => handleNumberInputChange("limitPrice", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Expiry</Label>
                  <Select 
                    value={formData.expiryType} 
                    onValueChange={(value) => handleInputChange("expiryType", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select expiry time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1 hour">1 hour</SelectItem>
                      <SelectItem value="1 day">1 day</SelectItem>
                      <SelectItem value="3 days">3 days</SelectItem>
                      <SelectItem value="7 days">7 days</SelectItem>
                      <SelectItem value="28 days">28 days</SelectItem>
                      <SelectItem value="Custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {formData.expiryType === "Custom" && (
                    <Input
                      type="datetime-local"
                      value={formData.expiryValue}
                      onChange={(e) => handleInputChange("expiryValue", e.target.value)}
                      placeholder="Set custom expiry time"
                      min={getCurrentDateTimeLocal()}
                    />
                  )}
                </div>

                {/* Advanced Section */}
                <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start p-0 h-auto">
                      <div className="flex items-center gap-2">
                        {isAdvancedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <span className="font-medium">Advanced</span>
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Expected execution</Label>
                      <Input
                        type="datetime-local"
                        value={formData.expectedExecutionTimestamp}
                        onChange={(e) => handleInputChange("expectedExecutionTimestamp", e.target.value)}
                        min={getCurrentDateTimeLocal()}
                      />
                    </div>

                    {/* Triggers if section */}
                    <div className="space-y-2">
                      <div>
                        <Label>Triggers if</Label>
                      </div>
                      <div className="flex flex-row items-center space-x-2 text-sm">
                        <div className="w-48">
                          <ReactSelect
                            options={triggerTokenOptions}
                            value={formData.triggerAsset}
                            onValueChange={(value) => handleInputChange("triggerAsset", value || "")}
                            placeholder={!formData.sellAsset || !formData.buyAsset ? "Select sell/buy tokens first" : "Select token"}
                            disabled={!formData.sellAsset || !formData.buyAsset}
                            getExplorerUrl={(token) => getExplorerUrl(token.chain_id, token.address)}
                          />
                        </div>
                        <span className="text-muted-foreground">price is</span>
                        <div className="w-28">
                          <Select 
                            value={formData.triggerCondition} 
                            onValueChange={(value) => handleInputChange("triggerCondition", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Condition" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="above">above</SelectItem>
                              <SelectItem value="below">below</SelectItem>
                              <SelectItem value="equals">equals</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-32">
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="$ 0.00"
                            value={formatNumberWithCommas(formData.triggerPrice)}
                            onChange={(e) => handleNumberInputChange("triggerPrice", e.target.value)}
                          />
                        </div>
                        <span className="text-muted-foreground">USD</span>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}

            {/* Step 2: Chat Configuration - Skip when preSelectedUser exists */}
            {currentStep === 2 && !preSelectedUser && (
              <>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Public Chat</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow anyone to join this trade discussion
                    </p>
                  </div>
                  <Switch
                    checked={isPublicChat}
                    onCheckedChange={setIsPublicChat}
                    disabled={!!preSelectedUser}
                  />
                </div>

                {!isPublicChat && (
                  <div className="space-y-4">
                    <Label>Select Contacts to Invite</Label>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {contactsLoading ? (
                        <p className="text-sm text-muted-foreground">Loading contacts...</p>
                      ) : contacts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No contacts available. Add contacts first to create private chats.
                        </p>
                      ) : (
                        contacts.map((contact) => (
                          <div key={contact.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={contact.id}
                              checked={selectedContacts.includes(contact.id)}
                              onCheckedChange={() => handleContactToggle(contact.id)}
                            />
                            <Label htmlFor={contact.id} className="flex items-center gap-2 cursor-pointer">
                              <img
                                src={contact.avatar || '/placeholder.svg'}
                                alt={contact.display_name}
                                className="w-6 h-6 rounded-full"
                              />
                              {contact.display_name}
                            </Label>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Step 3: Review & Publish */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <h3 className="font-medium">Trade Summary</h3>
                  <div className="grid grid-cols-[auto_1fr] gap-4 text-sm">
                    <span className="text-muted-foreground">Chain:</span>
                    <span>{chains.find(c => c.id === formData.chain_id)?.name}</span>
                    
                    <span className="text-muted-foreground">Sell:</span>
                    <span>
                      {(() => {
                        const sellToken = tokens.find(t => t.address === formData.sellAsset);
                        if (sellToken) {
                          return (
                            <div className="flex flex-col gap-1">
                              <span>{sellToken.name} ({sellToken.symbol})</span>
                              <a 
                                href={getExplorerUrl(sellToken.chain_id, sellToken.address)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline"
                              >
                                {sellToken.address}
                              </a>
                            </div>
                          );
                        }
                        return formData.sellAsset;
                      })()}
                    </span>
                    
                    <span className="text-muted-foreground">Buy:</span>
                    <span>
                      {(() => {
                        const buyToken = tokens.find(t => t.address === formData.buyAsset);
                        if (buyToken) {
                          return (
                            <div className="flex flex-col gap-1">
                              <span>{buyToken.name} ({buyToken.symbol})</span>
                              <a 
                                href={getExplorerUrl(buyToken.chain_id, buyToken.address)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline"
                              >
                                {buyToken.address}
                              </a>
                            </div>
                          );
                        }
                        return formData.buyAsset;
                      })()}
                    </span>
                    
                     <span className="text-muted-foreground">USD Amount:</span>
                     <span>${formatNumberWithCommas(formData.usdAmount)}</span>
                     
                     {formData.tokenAmount && (
                       <>
                         <span className="text-muted-foreground">Token Amount:</span>
                         <span>
                           {formData.tokenAmount} {price?.symbol || 'tokens'}
                         </span>
                       </>
                     )}
                    
                    <span className="text-muted-foreground">Limit Price:</span>
                    <span>${formatNumberWithCommas(formData.limitPrice)}</span>
                    
                    <span className="text-muted-foreground">Execution:</span>
                    <span>{new Date(formData.expectedExecutionTimestamp).toLocaleString()}</span>
                    
                    <span className="text-muted-foreground">Expiry:</span>
                    <span>{formatExpiryDisplay()}</span>
                    
                    {/* Show trigger conditions if set */}
                    {formData.triggerAsset && formData.triggerCondition && formData.triggerPrice && (
                      <>
                        <span className="text-muted-foreground">Trigger:</span>
                        <span>
                          {(() => {
                            const triggerToken = tokens.find(t => t.address === formData.triggerAsset);
                            if (triggerToken) {
                              return (
                                <>
                                   {triggerToken.name} ({triggerToken.symbol}) price {formData.triggerCondition} ${formatNumberWithCommas(formData.triggerPrice)}
                                </>
                              );
                            }
                            return `${formData.triggerAsset} price ${formData.triggerCondition} $${formatNumberWithCommas(formData.triggerPrice)}`;
                          })()}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <h3 className="font-medium">Chat Configuration</h3>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span>{isPublicChat ? "Public" : "Private"}</span>
                    </div>
                    {!isPublicChat && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Participants:</span>
                        <span>{selectedContacts.length + 1} members</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-4 pt-4">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                {currentStep === 1 ? "Cancel" : "Back"}
              </Button>
              
              {currentStep < 3 ? (
                <Button 
                  onClick={handleNext} 
                  className="flex-1"
                  disabled={currentStep === 1 && !isStep1Valid}
                >
                  {preSelectedUser && currentStep === 1 ? "Review & Publish" : "Next"}
                </Button>
              ) : (
                <Button 
                  onClick={handlePublish} 
                  className="flex-1"
                  disabled={isPublishing}
                >
                  {isPublishing ? "Publishing..." : "Publish Trade"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateTrade;