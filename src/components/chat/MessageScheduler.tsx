import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Repeat } from 'lucide-react';
import { useScheduledMessages } from '@/hooks/useScheduledMessages';
import { useMessageTemplates } from '@/hooks/useMessageTemplates';
import { format } from 'date-fns';

interface MessageSchedulerProps {
  chatId: string;
  trigger?: React.ReactNode;
}

export const MessageScheduler: React.FC<MessageSchedulerProps> = ({ chatId, trigger }) => {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [recurringPattern, setRecurringPattern] = useState('none');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const { scheduleMessage } = useScheduledMessages(chatId);
  const { templates = [], parseTemplate } = useMessageTemplates();

  const handleSchedule = async () => {
    if (!content.trim() || !scheduledDate || !scheduledTime) {
      console.warn('Missing required fields for scheduling message');
      return;
    }

    try {
      const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`);
      
      if (isNaN(scheduledFor.getTime())) {
        console.error('Invalid date/time for scheduling');
        return;
      }

      console.log('Scheduling message:', { chatId, content: content.substring(0, 50) + '...', scheduledFor });
      
      const success = await scheduleMessage(chatId, content, scheduledFor, {
        timezone,
        recurringPattern: recurringPattern === 'none' ? undefined : recurringPattern || undefined,
      });

      if (success) {
        setOpen(false);
        setContent('');
        setScheduledDate('');
        setScheduledTime('');
        setRecurringPattern('none');
        setSelectedTemplate('');
      }
    } catch (error) {
      console.error('Error in handleSchedule:', error);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    if (!templateId || !Array.isArray(templates)) return;
    
    const template = templates.find(t => t.id === templateId);
    if (template) {
      console.log('Selected template:', template.name);
      setContent(template.content);
      setSelectedTemplate(templateId);
    }
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    const date = format(now, 'yyyy-MM-dd');
    const time = format(now, 'HH:mm');
    return { date, time };
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Clock className="h-4 w-4 mr-2" />
      Schedule
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Message
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Selection */}
          {Array.isArray(templates) && templates.length > 0 && (
            <div className="space-y-2">
              <Label>Use Template (Optional)</Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} ({template.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Message Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Message Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your message..."
              className="min-h-[100px]"
            />
          </div>

          {/* Scheduling Options */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
          </div>

          {/* Timezone Selection */}
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="America/New_York">Eastern Time</SelectItem>
                <SelectItem value="America/Chicago">Central Time</SelectItem>
                <SelectItem value="America/Denver">Mountain Time</SelectItem>
                <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                <SelectItem value="Europe/London">London Time</SelectItem>
                <SelectItem value="Europe/Paris">Paris Time</SelectItem>
                <SelectItem value="Asia/Tokyo">Tokyo Time</SelectItem>
                <SelectItem value="Asia/Hong_Kong">Hong Kong Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Recurring Pattern */}
          <div className="space-y-2">
            <Label htmlFor="recurring">Recurring Pattern (Optional)</Label>
            <Select value={recurringPattern} onValueChange={setRecurringPattern}>
              <SelectTrigger>
                <SelectValue placeholder="No recurrence" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No recurrence</SelectItem>
                <SelectItem value="0 9 * * *">Daily at 9 AM</SelectItem>
                <SelectItem value="0 9 * * 1">Weekly on Monday at 9 AM</SelectItem>
                <SelectItem value="0 9 1 * *">Monthly on 1st at 9 AM</SelectItem>
                <SelectItem value="0 9 * * 1-5">Weekdays at 9 AM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSchedule}
              disabled={!content.trim() || !scheduledDate || !scheduledTime}
            >
              <Repeat className="h-4 w-4 mr-2" />
              Schedule Message
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};