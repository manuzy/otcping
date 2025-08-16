import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MessageSquare, Users, TrendingUp, Download, Clock, BookmarkIcon, Calendar as CalendarIcon } from 'lucide-react';
import { useMessages } from '@/hooks/useMessages';
import { useMessageBookmarks } from '@/hooks/useMessageBookmarks';
import { useScheduledMessages } from '@/hooks/useScheduledMessages';
import { useBlastMessages } from '@/hooks/useBlastMessages';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface AnalyticsDashboardProps {
  chatId?: string;
}

export const MessageAnalyticsDashboard = ({ chatId }: AnalyticsDashboardProps) => {
  const { messages } = useMessages(chatId);
  const { bookmarks } = useMessageBookmarks(chatId);
  const { scheduledMessages } = useScheduledMessages(chatId);
  const { blastMessages } = useBlastMessages();
  
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    if (!messages.length) return;

    const now = new Date();
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = subDays(now, days);

    // Filter messages by time range
    const filteredMessages = messages.filter(msg => 
      new Date(msg.timestamp) >= startDate
    );

    // Calculate analytics
    const messagesByDay = Array.from({ length: days }, (_, i) => {
      const date = subDays(now, days - i - 1);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      const dayMessages = filteredMessages.filter(msg => {
        const msgDate = new Date(msg.timestamp);
        return msgDate >= dayStart && msgDate <= dayEnd;
      });

      return {
        date: format(date, 'MMM dd'),
        messages: dayMessages.length,
        senders: new Set(dayMessages.map(msg => msg.senderId)).size,
      };
    });

    const messagesByHour = Array.from({ length: 24 }, (_, hour) => {
      const hourMessages = filteredMessages.filter(msg => 
        new Date(msg.timestamp).getHours() === hour
      );
      
      return {
        hour: hour.toString().padStart(2, '0') + ':00',
        messages: hourMessages.length,
      };
    });

    const messagesByType = filteredMessages.reduce((acc, msg) => {
      acc[msg.type] = (acc[msg.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topSenders = Object.entries(
      filteredMessages.reduce((acc, msg) => {
        acc[msg.senderId] = (acc[msg.senderId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    )
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([senderId, count]) => ({ senderId, count }));

    setAnalytics({
      totalMessages: filteredMessages.length,
      totalSenders: new Set(filteredMessages.map(msg => msg.senderId)).size,
      averagePerDay: Math.round(filteredMessages.length / days),
      messagesByDay,
      messagesByHour,
      messagesByType: Object.entries(messagesByType).map(([type, count]) => ({ type, count })),
      topSenders,
      bookmarksCount: bookmarks.length,
      scheduledCount: scheduledMessages.filter(msg => msg.status === 'pending').length,
      blastMessagesCount: blastMessages.length,
    });
  }, [messages, bookmarks, scheduledMessages, blastMessages, timeRange]);

  const exportAnalytics = () => {
    if (!analytics) return;

    const exportData = {
      summary: {
        totalMessages: analytics.totalMessages,
        totalSenders: analytics.totalSenders,
        averagePerDay: analytics.averagePerDay,
        bookmarks: analytics.bookmarksCount,
        scheduledMessages: analytics.scheduledCount,
        blastMessages: analytics.blastMessagesCount,
      },
      messagesByDay: analytics.messagesByDay,
      messagesByHour: analytics.messagesByHour,
      messagesByType: analytics.messagesByType,
      topSenders: analytics.topSenders,
      exportedAt: new Date().toISOString(),
      timeRange,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `message-analytics-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Loading analytics...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Message Analytics</h2>
          <p className="text-muted-foreground">
            Comprehensive analytics for your messaging activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <TabsList>
              <TabsTrigger value="7d">7 Days</TabsTrigger>
              <TabsTrigger value="30d">30 Days</TabsTrigger>
              <TabsTrigger value="90d">90 Days</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={exportAnalytics} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalMessages}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.averagePerDay} per day average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Senders</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalSenders}</div>
            <p className="text-xs text-muted-foreground">
              Unique participants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bookmarks</CardTitle>
            <BookmarkIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.bookmarksCount}</div>
            <p className="text-xs text-muted-foreground">
              Saved messages
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.scheduledCount}</div>
            <p className="text-xs text-muted-foreground">
              Pending messages
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList>
          <TabsTrigger value="daily">Daily Activity</TabsTrigger>
          <TabsTrigger value="hourly">Hourly Pattern</TabsTrigger>
          <TabsTrigger value="types">Message Types</TabsTrigger>
          <TabsTrigger value="senders">Top Senders</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Message Volume</CardTitle>
              <CardDescription>
                Messages and active senders over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.messagesByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="messages" fill="hsl(var(--primary))" />
                  <Bar dataKey="senders" fill="hsl(var(--secondary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hourly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hourly Activity Pattern</CardTitle>
              <CardDescription>
                When are users most active?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.messagesByHour}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="messages" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Message Types Distribution</CardTitle>
              <CardDescription>
                Breakdown by message type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.messagesByType}
                    dataKey="count"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ type, count }) => `${type}: ${count}`}
                  >
                    {analytics.messagesByType.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="senders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Senders</CardTitle>
              <CardDescription>
                Most active message senders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.topSenders} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="senderId" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};