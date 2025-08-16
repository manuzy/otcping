import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Users, Calendar, Building2 } from 'lucide-react';
import { useBlastMessages } from '@/hooks/useBlastMessages';
import { useContacts } from '@/hooks/useContacts';
import { useChats } from '@/hooks/useChats';
import { usePublicUsers } from '@/hooks/usePublicUsers';

interface BlastMessageComposerProps {
  trigger?: React.ReactNode;
}

export const BlastMessageComposer: React.FC<BlastMessageComposerProps> = ({ trigger }) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<Array<{ type: 'user' | 'chat' | 'institution'; id: string; name: string }>>([]);
  const [scheduledFor, setScheduledFor] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  const { createBlastMessage, scheduleBlastMessage, sendBlastMessage } = useBlastMessages();
  const { contacts } = useContacts();
  const { chats } = useChats();
  const { users } = usePublicUsers();

  const resetForm = () => {
    setTitle('');
    setContent('');
    setSelectedRecipients([]);
    setScheduledFor('');
    setScheduledTime('');
  };

  const handleRecipientToggle = (recipient: { type: 'user' | 'chat' | 'institution'; id: string; name: string }) => {
    setSelectedRecipients(prev => {
      const exists = prev.find(r => r.type === recipient.type && r.id === recipient.id);
      if (exists) {
        return prev.filter(r => !(r.type === recipient.type && r.id === recipient.id));
      } else {
        return [...prev, recipient];
      }
    });
  };

  const isRecipientSelected = (type: string, id: string) => {
    return selectedRecipients.some(r => r.type === type && r.id === id);
  };

  const handleSendNow = async () => {
    if (!title.trim() || !content.trim() || selectedRecipients.length === 0) return;

    const recipients = selectedRecipients.map(r => ({ type: r.type, id: r.id }));
    const blastId = await createBlastMessage(title, content, recipients);
    
    if (blastId) {
      const success = await sendBlastMessage(blastId);
      if (success) {
        setOpen(false);
        resetForm();
      }
    }
  };

  const handleSchedule = async () => {
    if (!title.trim() || !content.trim() || selectedRecipients.length === 0 || !scheduledFor || !scheduledTime) return;

    const recipients = selectedRecipients.map(r => ({ type: r.type, id: r.id }));
    const blastId = await createBlastMessage(title, content, recipients);
    
    if (blastId) {
      const scheduledDateTime = new Date(`${scheduledFor}T${scheduledTime}`);
      const success = await scheduleBlastMessage(blastId, scheduledDateTime);
      if (success) {
        setOpen(false);
        resetForm();
      }
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Send className="h-4 w-4 mr-2" />
      Blast Message
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Compose Blast Message
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Message Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Message Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter message title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Message Content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type your blast message content..."
                className="min-h-[120px]"
              />
            </div>
          </div>

          {/* Recipients Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Recipients ({selectedRecipients.length} selected)</Label>
              <div className="flex flex-wrap gap-1">
                {selectedRecipients.slice(0, 3).map((recipient, index) => (
                  <Badge key={`${recipient.type}-${recipient.id}`} variant="secondary" className="text-xs">
                    {recipient.name}
                  </Badge>
                ))}
                {selectedRecipients.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{selectedRecipients.length - 3} more
                  </Badge>
                )}
              </div>
            </div>

            <Tabs defaultValue="contacts" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="contacts" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Contacts
                </TabsTrigger>
                <TabsTrigger value="chats" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Chats
                </TabsTrigger>
                <TabsTrigger value="institutions" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Institutions
                </TabsTrigger>
              </TabsList>

              <TabsContent value="contacts" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Select Contacts</CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-48 overflow-y-auto">
                    <div className="space-y-2">
                      {contacts.map(contact => {
                        const user = users.find(u => u.id === contact.id);
                        if (!user) return null;
                        
                        return (
                          <div key={contact.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`contact-${contact.id}`}
                              checked={isRecipientSelected('user', contact.id)}
                              onCheckedChange={() => handleRecipientToggle({
                                type: 'user',
                                id: contact.id,
                                name: user.displayName || 'Unknown User'
                              })}
                            />
                            <Label 
                              htmlFor={`contact-${contact.id}`}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <span>{user.displayName || 'Unknown User'}</span>
                              {user.traderType && (
                                <Badge variant="outline" className="text-xs">
                                  {user.traderType}
                                </Badge>
                              )}
                            </Label>
                          </div>
                        );
                      })}
                      {contacts.length === 0 && (
                        <p className="text-sm text-muted-foreground">No contacts found</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="chats" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Select Chats</CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-48 overflow-y-auto">
                    <div className="space-y-2">
                      {chats.map(chat => (
                        <div key={chat.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`chat-${chat.id}`}
                            checked={isRecipientSelected('chat', chat.id)}
                            onCheckedChange={() => handleRecipientToggle({
                              type: 'chat',
                              id: chat.id,
                              name: chat.name
                            })}
                          />
                          <Label 
                            htmlFor={`chat-${chat.id}`}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <span>{chat.name}</span>
                            {chat.isPublic && (
                              <Badge variant="outline" className="text-xs">Public</Badge>
                            )}
                          </Label>
                        </div>
                      ))}
                      {chats.length === 0 && (
                        <p className="text-sm text-muted-foreground">No chats found</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="institutions" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Select Institutions</CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-48 overflow-y-auto">
                    <p className="text-sm text-muted-foreground">
                      Institution blast messaging coming soon...
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Scheduling Options */}
          <div className="space-y-4">
            <Label>Scheduling (Optional)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduled-date">Schedule Date</Label>
                <Input
                  id="scheduled-date"
                  type="date"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduled-time">Schedule Time</Label>
                <Input
                  id="scheduled-time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            
            {scheduledFor && scheduledTime ? (
              <Button 
                onClick={handleSchedule}
                disabled={!title.trim() || !content.trim() || selectedRecipients.length === 0}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Blast
              </Button>
            ) : (
              <Button 
                onClick={handleSendNow}
                disabled={!title.trim() || !content.trim() || selectedRecipients.length === 0}
              >
                <Send className="h-4 w-4 mr-2" />
                Send Now
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};