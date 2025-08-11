import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReactSelect } from "@/components/ui/react-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { useChains } from "@/hooks/useChains";
import { useTokens } from "@/hooks/useTokens";
import { useCoinMarketCapPrice } from "@/hooks/useCoinMarketCapPrice";
import { tokenToSelectOption, formatTokenDisplay, truncateAddress } from "@/lib/tokenUtils";
import { formatNumberWithCommas, parseFormattedNumber, isValidNumberInput } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { Trade } from "@/types";

interface EditTradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trade: Trade;
  onSave: (updatedTrade: Partial<Trade>) => Promise<void>;
}

interface EditFormData {
  tokenAmount: string;
  limitPrice: string;
  expectedExecutionTimestamp: string;
  expiryType: string;
  expiryValue: string;
  triggerAsset: string;
  triggerCondition: string;
  triggerPrice: string;
}

export const EditTradeDialog = ({ open, onOpenChange, trade, onSave }: EditTradeDialogProps) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<EditFormData>({
    tokenAmount: trade.tokenAmount || "",
    limitPrice: trade.limitPrice || "",
    expectedExecutionTimestamp: trade.expectedExecution ? new Date(trade.expectedExecution).toISOString().slice(0, 16) : "",
    expiryType: trade.expiryType || "",
    expiryValue: "",
    triggerAsset: trade.triggerAsset || "",
    triggerCondition: trade.triggerCondition || "",
    triggerPrice: trade.triggerPrice || ""
  });

  const { chains } = useChains();
  const chainId = trade.chain_id || 1;
  const { tokens } = useTokens(chainId);
  
  const { 
    price, 
    loading: priceLoading, 
    refreshPrice, 
    convertUSDToToken 
  } = useCoinMarketCapPrice(trade.sellAsset, chainId);

  // Initialize expiry value based on trade data
  useEffect(() => {
    if (trade.expiryTimestamp) {
      const expiryDate = new Date(trade.expiryTimestamp);
      const now = new Date();
      
      if (trade.expiryType === "minutes") {
        const minutes = Math.round((expiryDate.getTime() - now.getTime()) / (1000 * 60));
        setFormData(prev => ({ ...prev, expiryValue: minutes.toString() }));
      } else if (trade.expiryType === "hours") {
        const hours = Math.round((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60));
        setFormData(prev => ({ ...prev, expiryValue: hours.toString() }));
      } else if (trade.expiryType === "days") {
        const days = Math.round((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        setFormData(prev => ({ ...prev, expiryValue: days.toString() }));
      }
    }
  }, [trade.expiryTimestamp, trade.expiryType]);

  const handleInputChange = (field: keyof EditFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNumberInputChange = (field: keyof EditFormData, value: string) => {
    if (isValidNumberInput(value)) {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const getCurrentDateTimeLocal = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 16);
    return localISOTime;
  };

  const calculateExpiry = () => {
    if (!formData.expiryType || !formData.expiryValue) return null;
    
    const now = new Date();
    const value = parseInt(formData.expiryValue);
    
    switch (formData.expiryType) {
      case "minutes":
        return new Date(now.getTime() + value * 60 * 1000);
      case "hours":
        return new Date(now.getTime() + value * 60 * 60 * 1000);
      case "days":
        return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
      default:
        return null;
    }
  };

  const formatExpiryDisplay = () => {
    const expiry = calculateExpiry();
    if (!expiry) return "";
    return expiry.toLocaleString();
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedData: Partial<Trade> = {};

      // Only include changed fields
      if (formData.tokenAmount !== (trade.tokenAmount || "")) {
        updatedData.tokenAmount = formData.tokenAmount;
      }
      if (formData.limitPrice !== (trade.limitPrice || "")) {
        updatedData.limitPrice = formData.limitPrice;
      }
      if (formData.expectedExecutionTimestamp) {
        const newDate = new Date(formData.expectedExecutionTimestamp);
        const originalDate = trade.expectedExecution ? new Date(trade.expectedExecution) : null;
        if (!originalDate || newDate.getTime() !== originalDate.getTime()) {
          updatedData.expectedExecution = newDate;
        }
      }
      if (formData.expiryType && formData.expiryValue) {
        const newExpiry = calculateExpiry();
        const originalExpiry = trade.expiryTimestamp ? new Date(trade.expiryTimestamp) : null;
        if (newExpiry && (!originalExpiry || newExpiry.getTime() !== originalExpiry.getTime())) {
          updatedData.expiryTimestamp = newExpiry;
          updatedData.expiryType = formData.expiryType;
        }
      }
      if (formData.triggerAsset !== (trade.triggerAsset || "")) {
        updatedData.triggerAsset = formData.triggerAsset;
      }
      if (formData.triggerCondition !== (trade.triggerCondition || "")) {
        updatedData.triggerCondition = formData.triggerCondition;
      }
      if (formData.triggerPrice !== (trade.triggerPrice || "")) {
        updatedData.triggerPrice = formData.triggerPrice;
      }

      await onSave(updatedData);
      onOpenChange(false);
    } catch (error) {
      logger.error('Failed to save trade', {
        component: 'EditTradeDialog',
        operation: 'handleSave',
        tradeId: trade.id
      }, error);
    } finally {
      setIsSaving(false);
    }
  };

  const sellToken = tokens.find(t => t.address === trade.sellAsset);
  const buyToken = tokens.find(t => t.address === trade.buyAsset);
  const triggerTokenOptions = tokens.map(tokenToSelectOption);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Trade</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Trade Details */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Sell Token</Label>
                <div className="text-sm text-muted-foreground">
                  {sellToken ? formatTokenDisplay(sellToken) : 'Unknown Token'}
                </div>
              </div>
              <div>
                <Label>Buy Token</Label>
                <div className="text-sm text-muted-foreground">
                  {buyToken ? formatTokenDisplay(buyToken) : 'Unknown Token'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tokenAmount">Token Amount</Label>
                <Input
                  id="tokenAmount"
                  placeholder="0.00"
                  value={formData.tokenAmount}
                  onChange={(e) => handleNumberInputChange('tokenAmount', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="limitPrice">Limit Price</Label>
                <Input
                  id="limitPrice"
                  placeholder="0.00"
                  value={formData.limitPrice}
                  onChange={(e) => handleNumberInputChange('limitPrice', e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="expectedExecution">Expected Execution (Optional)</Label>
              <Input
                id="expectedExecution"
                type="datetime-local"
                value={formData.expectedExecutionTimestamp}
                onChange={(e) => handleInputChange('expectedExecutionTimestamp', e.target.value)}
                min={getCurrentDateTimeLocal()}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expiryType">Expiry Type</Label>
                <Select value={formData.expiryType} onValueChange={(value) => handleInputChange('expiryType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select expiry type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="expiryValue">Expiry Value</Label>
                <Input
                  id="expiryValue"
                  placeholder="Enter value"
                  value={formData.expiryValue}
                  onChange={(e) => handleInputChange('expiryValue', e.target.value)}
                />
                {formData.expiryType && formData.expiryValue && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Expires: {formatExpiryDisplay()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Advanced Options */}
          <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0">
                <span>Advanced Options</span>
                {isAdvancedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              <div>
                <Label>Trigger Asset</Label>
                <ReactSelect
                  options={triggerTokenOptions}
                  value={formData.triggerAsset}
                  onValueChange={(value) => {
                    handleInputChange('triggerAsset', value || '');
                  }}
                  placeholder="Select trigger token..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="triggerCondition">Trigger Condition</Label>
                  <Select value={formData.triggerCondition} onValueChange={(value) => handleInputChange('triggerCondition', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="above">Above</SelectItem>
                      <SelectItem value="below">Below</SelectItem>
                      <SelectItem value="equal">Equal to</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="triggerPrice">Trigger Price</Label>
                  <Input
                    id="triggerPrice"
                    placeholder="0.00"
                    value={formData.triggerPrice}
                    onChange={(e) => handleNumberInputChange('triggerPrice', e.target.value)}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};