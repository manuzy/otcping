import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Check } from "lucide-react";
import { useAppKitAccount } from '@reown/appkit/react';
import { useContacts } from "@/hooks/useContacts";
import { useChats } from "@/hooks/useChats";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Mock data for chains and tokens
const chains = [
  { id: "ethereum", name: "Ethereum" },
  { id: "polygon", name: "Polygon" },
  { id: "base", name: "Base" },
  { id: "arbitrum", name: "Arbitrum" }
];

const tokens = [
  { id: "eth", name: "ETH", symbol: "ETH" },
  { id: "usdc", name: "USD Coin", symbol: "USDC" },
  { id: "usdt", name: "Tether", symbol: "USDT" },
  { id: "wbtc", name: "Wrapped Bitcoin", symbol: "WBTC" },
  { id: "dai", name: "Dai", symbol: "DAI" }
];

interface TradeFormData {
  chain: string;
  sellAsset: string;
  buyAsset: string;
  usdAmount: string;
  expectedExecutionTimestamp: string;
}

const CreateTrade = () => {
  const navigate = useNavigate();
  const { address } = useAppKitAccount();
  const { contacts, loading: contactsLoading } = useContacts();
  const { createChat } = useChats();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isPublicChat, setIsPublicChat] = useState(true);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [formData, setFormData] = useState<TradeFormData>({
    chain: "",
    sellAsset: "",
    buyAsset: "",
    usdAmount: "",
    expectedExecutionTimestamp: ""
  });

  const handleInputChange = (field: keyof TradeFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleContactToggle = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate("/");
    }
  };

  const handlePublish = async () => {
    if (!address) return;
    
    setIsPublishing(true);
    
    try {
      // Create the trade first
      const { data: tradeData, error: tradeError } = await supabase
        .from('trades')
        .insert({
          chain: formData.chain,
          pair: `${formData.sellAsset}/${formData.buyAsset}`,
          size: formData.usdAmount,
          price: "Market",
          type: "sell",
          status: "active",
          created_by: address
        })
        .select()
        .single();

      if (tradeError) throw tradeError;

      // Create the chat
      const chatName = isPublicChat 
        ? `${formData.sellAsset}/${formData.buyAsset} Trade` 
        : "Private Trade Chat";
      
      const chatId = await createChat(chatName, isPublicChat, tradeData.id);
      
      if (!chatId) {
        throw new Error("Failed to create chat");
      }

      // Add selected contacts to private chat
      if (!isPublicChat && selectedContacts.length > 0) {
        const { error: participantsError } = await supabase
          .from('chat_participants')
          .insert(
            selectedContacts.map(contactId => ({
              chat_id: chatId,
              user_id: contactId
            }))
          );

        if (participantsError) {
          console.error("Error adding participants:", participantsError);
        }
      }

      toast({
        title: "Trade Created",
        description: "Your trade has been published successfully!",
      });

      // Navigate to the new chat
      navigate(`/?chat=${chatId}`);
    } catch (error) {
      console.error('Error creating trade:', error);
      toast({
        title: "Error",
        description: "Failed to create trade. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const isStep1Valid = formData.chain && formData.sellAsset && formData.buyAsset && formData.usdAmount && formData.expectedExecutionTimestamp;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Create New Trade</h1>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${currentStep >= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
              `}>
                {currentStep > step ? <Check className="h-4 w-4" /> : step}
              </div>
              {step < 3 && (
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
              {currentStep === 3 && "Review & Publish"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Trade Details */}
            {currentStep === 1 && (
              <>
                <div className="space-y-2">
                  <Label>Chain *</Label>
                  <Select value={formData.chain} onValueChange={(value) => handleInputChange("chain", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select blockchain" />
                    </SelectTrigger>
                    <SelectContent>
                      {chains.map((chain) => (
                        <SelectItem key={chain.id} value={chain.id}>
                          {chain.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Sell token *</Label>
                  <Select value={formData.sellAsset} onValueChange={(value) => handleInputChange("sellAsset", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select token to sell" />
                    </SelectTrigger>
                    <SelectContent>
                      {tokens.map((token) => (
                        <SelectItem key={token.id} value={token.symbol}>
                          {token.name} ({token.symbol})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Buy token *</Label>
                  <Select value={formData.buyAsset} onValueChange={(value) => handleInputChange("buyAsset", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select token to buy" />
                    </SelectTrigger>
                    <SelectContent>
                      {tokens.map((token) => (
                        <SelectItem key={token.id} value={token.symbol}>
                          {token.name} ({token.symbol})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>USD amount *</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="$ 0.00"
                    value={formData.usdAmount}
                    onChange={(e) => handleInputChange("usdAmount", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Expected execution *</Label>
                  <Input
                    type="datetime-local"
                    value={formData.expectedExecutionTimestamp}
                    onChange={(e) => handleInputChange("expectedExecutionTimestamp", e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Step 2: Chat Configuration */}
            {currentStep === 2 && (
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
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Chain:</span>
                    <span>{chains.find(c => c.id === formData.chain)?.name}</span>
                    
                    <span className="text-muted-foreground">Sell:</span>
                    <span>{formData.sellAsset}</span>
                    
                    <span className="text-muted-foreground">Buy:</span>
                    <span>{formData.buyAsset}</span>
                    
                    <span className="text-muted-foreground">Amount:</span>
                    <span>${formData.usdAmount}</span>
                    
                    <span className="text-muted-foreground">Execution:</span>
                    <span>{new Date(formData.expectedExecutionTimestamp).toLocaleString()}</span>
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
                  Next
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