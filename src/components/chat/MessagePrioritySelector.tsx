import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Flag, Clock, AlertTriangle } from 'lucide-react';
import { PriorityLevel, useMessagePriorities } from '@/hooks/useMessagePriorities';
import { useMessageAcknowledgments } from '@/hooks/useMessageAcknowledgments';

interface MessagePrioritySelectorProps {
  messageId: string;
}

export const MessagePrioritySelector = ({ messageId }: MessagePrioritySelectorProps) => {
  const { setPriority, getMessagePriority, removePriority } = useMessagePriorities();
  const { acknowledgeMessage, isMessageAcknowledgedByUser, getAcknowledmentStats } = useMessageAcknowledgments();
  
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<PriorityLevel>('normal');
  const [requiresAck, setRequiresAck] = useState(false);
  const [deadline, setDeadline] = useState<Date>();
  const [ackNotes, setAckNotes] = useState('');

  const currentPriority = getMessagePriority(messageId);
  const isAcknowledged = isMessageAcknowledgedByUser(messageId);
  const ackStats = getAcknowledmentStats(messageId);

  const priorityConfig = {
    low: { color: 'bg-blue-500', label: 'Low', icon: Flag },
    normal: { color: 'bg-gray-500', label: 'Normal', icon: Flag },
    high: { color: 'bg-orange-500', label: 'High', icon: Flag },
    urgent: { color: 'bg-red-500', label: 'Urgent', icon: AlertTriangle },
  };

  const handleSetPriority = async () => {
    const success = await setPriority(messageId, selectedLevel, {
      requiresAcknowledgment: requiresAck,
      deadline: deadline,
    });

    if (success) {
      setIsOpen(false);
    }
  };

  const handleRemovePriority = async () => {
    const success = await removePriority(messageId);
    if (success) {
      setIsOpen(false);
    }
  };

  const handleAcknowledge = async () => {
    await acknowledgeMessage(messageId, ackNotes || undefined);
    setAckNotes('');
  };

  const PriorityIcon = currentPriority ? priorityConfig[currentPriority.priorityLevel].icon : Flag;

  return (
    <div className="flex items-center gap-2">
      {/* Priority Display/Selector */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <PriorityIcon className={`h-3 w-3 ${currentPriority ? 'text-primary' : 'text-muted-foreground'}`} />
            {currentPriority && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {priorityConfig[currentPriority.priorityLevel].label}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Priority Level</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {(Object.entries(priorityConfig) as [PriorityLevel, any][]).map(([level, config]) => (
                  <Button
                    key={level}
                    variant={selectedLevel === level ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedLevel(level)}
                    className="justify-start"
                  >
                    <config.icon className="h-3 w-3 mr-2" />
                    {config.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="requires-ack"
                checked={requiresAck}
                onCheckedChange={setRequiresAck}
              />
              <Label htmlFor="requires-ack" className="text-sm">
                Requires acknowledgment
              </Label>
            </div>

            {requiresAck && (
              <div>
                <Label className="text-sm font-medium">Deadline (optional)</Label>
                <Calendar
                  mode="single"
                  selected={deadline}
                  onSelect={setDeadline}
                  disabled={(date) => date < new Date()}
                  className="rounded-md border mt-2"
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSetPriority} size="sm" className="flex-1">
                Set Priority
              </Button>
              {currentPriority && (
                <Button onClick={handleRemovePriority} variant="outline" size="sm">
                  Remove
                </Button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Acknowledgment Section */}
      {currentPriority?.requiresAcknowledgment && (
        <div className="flex items-center gap-2">
          {!isAcknowledged ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2">
                  <Clock className="h-3 w-3 mr-1" />
                  Acknowledge
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="ack-notes" className="text-sm font-medium">
                      Notes (optional)
                    </Label>
                    <Textarea
                      id="ack-notes"
                      placeholder="Add acknowledgment notes..."
                      value={ackNotes}
                      onChange={(e) => setAckNotes(e.target.value)}
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleAcknowledge} size="sm" className="w-full">
                    Acknowledge Message
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <Badge variant="secondary" className="text-xs">
              ✓ Acknowledged
            </Badge>
          )}

          {ackStats.total > 0 && (
            <Badge variant="outline" className="text-xs">
              {ackStats.total} ack{ackStats.total !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      )}

      {/* Deadline Warning */}
      {currentPriority?.deadline && new Date() > currentPriority.deadline && !isAcknowledged && (
        <Badge variant="destructive" className="text-xs animate-pulse">
          Overdue
        </Badge>
      )}
    </div>
  );
};