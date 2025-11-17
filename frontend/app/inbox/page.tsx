'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getSocket, initSocket } from '@/lib/socket';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Send, ArrowLeft, Smile, Ban, Flag } from 'lucide-react';
import { toast } from 'sonner';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

interface InboxMessage {
  _id: string;
  userId?: string;
  senderType: 'admin' | 'user';
  anonymousUserId: string;
  messageText: string;
  isRead: boolean;
  createdAt: string;
}

interface InboxUser {
  userId: string;
  anonymousUserId: string;
  latestMessage: {
    content: string;
    createdAt: string;
    senderType: string;
  } | null;
  unreadCount: number;
}

export default function AdminInboxPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<InboxUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [anonymousUserId, setAnonymousUserId] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
      return;
    }
    if (user && user.role !== 'admin') {
      router.push('/groups');
      return;
    }
    if (user) {
      fetchUsers();
      setupSocket();
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (selectedUserId) {
      fetchMessages(selectedUserId);
      // Always check fresh block status from database when user is selected
      checkBlockStatus(selectedUserId);
      // Re-setup socket listeners when user changes
      setupSocket();
    }
  }, [selectedUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const setupSocket = () => {
    const token = sessionStorage.getItem('token');
    if (!token) return;

    let socket = getSocket();
    if (!socket || !socket.connected) {
      socket = initSocket(token);
    }

    socket.on('new-inbox-message', (message: any) => {
      // Check if this message is for the currently selected user
      if (selectedUserId && message.userId === selectedUserId) {
        setMessages((prev) => {
          // Remove any temp messages with same content
          const filtered = prev.filter(m => 
            !m._id?.toString().startsWith('temp-') || m.messageText !== message.messageText
          );
          // Check if message already exists
          const exists = filtered.some(m => m._id === message._id);
          if (exists) return filtered;
          return [...filtered, message];
        });
      }
      // Refresh user list to update unread counts
      fetchUsers();
    });

    socket.off('inbox-message-sent'); // Remove previous listener
    socket.on('inbox-message-sent', (message: any) => {
      if (selectedUserId && message.userId === selectedUserId) {
        setMessages((prev) => {
          // Replace temp message with real one
          const filtered = prev.filter(m => 
            !m._id?.toString().startsWith('temp-') || m.messageText !== message.messageText
          );
          // Check if message already exists
          const exists = filtered.some(m => m._id === message._id);
          if (exists) return filtered;
          return [...filtered, message];
        });
      }
      fetchUsers();
    });

    socket.off('error'); // Remove previous listener
    socket.on('error', (error: any) => {
      if (error.message?.includes('blocked')) {
        toast.error('Cannot send message. User is blocked.');
        setIsBlocked(true);
        // Remove any temp messages
        setMessages((prev) => prev.filter(m => !m._id?.toString().startsWith('temp-')));
      }
    });

    // Listen for real-time block/unblock events
    socket.off('user-blocked');
    socket.on('user-blocked', async (data: any) => {
      // If the blocked user matches the selected user, update block status
      if (selectedUserId && data.blockedUser === selectedUserId) {
        setIsBlocked(true);
        setMessages([]);
      }
    });

    socket.off('user-unblocked');
    socket.on('user-unblocked', async (data: any) => {
      // If the unblocked user matches the selected user, update block status
      if (selectedUserId && (data.unblockedUser === selectedUserId || data.unblockedBy === selectedUserId)) {
        setIsBlocked(false);
        fetchMessages(selectedUserId);
      }
    });
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/inbox/admin/users');
      setUsers(response.data.users);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
      toast.error('Failed to load inbox');
    }
  };

  const fetchMessages = async (userId: string) => {
    try {
      const response = await api.get(`/inbox/admin/user/${userId}`);
      setMessages(response.data.messages);
      setAnonymousUserId(response.data.anonymousUserId);
    } catch (err: any) {
      console.error('Failed to fetch messages:', err);
      toast.error('Failed to load messages');
    }
  };

  const checkBlockStatus = async (userId: string) => {
    try {
      const response = await api.get(`/block/check/${userId}`);
      setIsBlocked(response.data.isBlocked);
    } catch (err: any) {
      console.error('Failed to check block status:', err);
    }
  };

  const handleBlockUser = async () => {
    if (!selectedUserId) return;
    
    try {
      // Optimistically update UI immediately
      setIsBlocked(true);
      setMessages([]);
      
      // Make API call
      await api.post('/block/block', { userId: selectedUserId });
      toast.success('User blocked successfully');
      
      // Refresh users list (non-blocking)
      fetchUsers();
    } catch (err: any) {
      // Revert on error
      setIsBlocked(false);
      toast.error(err.response?.data?.message || 'Failed to block user');
      // Reload to get correct state
      await checkBlockStatus(selectedUserId);
      fetchMessages(selectedUserId);
    }
  };

  const handleUnblockUser = async () => {
    if (!selectedUserId) return;
    
    try {
      // Optimistically update UI immediately
      setIsBlocked(false);
      
      // Make API call
      await api.post('/block/unblock', { userId: selectedUserId });
      toast.success('User unblocked successfully');
      
      // Reload messages and users in parallel
      Promise.all([
        fetchMessages(selectedUserId),
        fetchUsers()
      ]);
    } catch (err: any) {
      // Revert on error
      setIsBlocked(true);
      toast.error(err.response?.data?.message || 'Failed to unblock user');
      // Reload to get correct state
      await checkBlockStatus(selectedUserId);
      fetchMessages(selectedUserId);
    }
  };

  const handleReportUser = async () => {
    if (!selectedUserId || !reportReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    
    try {
      await api.post('/block/report', {
        userId: selectedUserId,
        reason: reportReason,
        description: reportDescription
      });
      toast.success('User reported successfully');
      setShowReportDialog(false);
      setReportReason('');
      setReportDescription('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to report user');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUserId) return;

    // Check if blocked BEFORE any optimistic update
    if (isBlocked) {
      toast.error('Cannot send message. User is blocked.');
      setNewMessage(''); // Clear input
      return;
    }

    const messageText = newMessage.trim();
    setNewMessage('');

    // Optimistic UI update - add message immediately
    const tempMessage: InboxMessage = {
      _id: `temp-${Date.now()}`,
      userId: selectedUserId,
      senderType: 'admin',
      anonymousUserId: anonymousUserId || 'Admin',
      messageText,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      let socket = getSocket();
      if (!socket || !socket.connected) {
        const token = sessionStorage.getItem('token');
        if (token) {
          socket = initSocket(token);
        } else {
          // If socket fails, refetch messages
          setTimeout(() => fetchMessages(selectedUserId), 500);
          // Remove temp message
          setMessages((prev) => prev.filter(m => m._id !== tempMessage._id));
          return;
        }
      }

      // Quick check using cached state (backend will validate anyway)
      if (isBlocked) {
        toast.error('Cannot send message. User is blocked.');
        setMessages((prev) => prev.filter(m => m._id !== tempMessage._id));
        return;
      }

      socket.emit('send-inbox-message', {
        userId: selectedUserId,
        messageText
      });

      // Refresh users list for unread count (non-blocking)
      fetchUsers();
      // No need to refetch messages - socket will send the message back via 'inbox-message-sent'
    } catch (err: any) {
      console.error('Failed to send message:', err);
      // Check if error is due to blocking
      if (err.response?.data?.message?.includes('blocked')) {
        toast.error('Cannot send message. User is blocked.');
        setIsBlocked(true);
      } else {
        toast.error('Failed to send message');
      }
      // Remove temp message on error
      setMessages((prev) => prev.filter(m => m._id !== tempMessage._id));
      // Refetch to get correct state
      fetchMessages(selectedUserId);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      <div className="border-b border-border p-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">
            Admin Inbox
          </h1>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - User List */}
        <div className="w-80 border-r border-border overflow-y-auto">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-foreground mb-4">
              Conversations
            </h2>
            {users.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No conversations yet
              </p>
            ) : (
              <div className="space-y-2">
                {users.map((inboxUser) => (
                  <Card
                    key={inboxUser.userId}
                    className={`cursor-pointer hover:bg-secondary transition-colors ${
                      selectedUserId === inboxUser.userId ? 'bg-secondary' : ''
                    }`}
                    onClick={() => setSelectedUserId(inboxUser.userId)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {inboxUser.anonymousUserId}
                          </p>
                          {inboxUser.latestMessage && (
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {inboxUser.latestMessage.messageText || inboxUser.latestMessage.content}
                            </p>
                          )}
                        </div>
                        {inboxUser.unreadCount > 0 && (
                          <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                            {inboxUser.unreadCount}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Chat Window */}
        <div className="flex-1 flex flex-col">
          {selectedUserId ? (
            <>
              <div className="border-b border-border p-4 flex items-center justify-between">
                <h2 className="font-semibold text-foreground">
                  {anonymousUserId || 'User'}
                </h2>
                <div className="flex gap-2 items-center">
                  <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Flag className="w-4 h-4" />
                        <span>Report</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Report User</DialogTitle>
                        <DialogDescription>
                          Report this user for inappropriate behavior
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="reason">Reason *</Label>
                          <Input
                            id="reason"
                            placeholder="e.g., Harassment, Spam, Inappropriate content"
                            value={reportReason}
                            onChange={(e) => setReportReason(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">Description (Optional)</Label>
                          <Textarea
                            id="description"
                            placeholder="Provide more details..."
                            value={reportDescription}
                            onChange={(e) => setReportDescription(e.target.value)}
                            rows={3}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowReportDialog(false);
                              setReportReason('');
                              setReportDescription('');
                            }}
                          >
                            Cancel
                          </Button>
                          <Button onClick={handleReportUser}>
                            Submit Report
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  {isBlocked ? (
                    <Button variant="outline" size="sm" onClick={handleUnblockUser} className="flex items-center gap-2">
                      <Ban className="w-4 h-4" />
                      <span>Unblock</span>
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={handleBlockUser} className="flex items-center gap-2">
                      <Ban className="w-4 h-4" />
                      <span>Block</span>
                    </Button>
                  )}
                </div>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="max-w-4xl mx-auto space-y-4">
                  {messages.map((message) => {
                    const isAdmin = message.senderType === 'admin';
                    return (
                      <div
                        key={message._id}
                        className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          isAdmin
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground'
                        }`}>
                          <p className="text-sm break-words">{message.messageText}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {formatTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {isBlocked && (
                <div className="border-t border-border p-4 bg-destructive/10">
                  <p className="text-sm text-destructive text-center">
                    This user is blocked. You cannot send messages.
                  </p>
                </div>
              )}
              {!isBlocked && (
                <form onSubmit={handleSendMessage} className="border-t border-border p-4">
                  <div className="max-w-4xl mx-auto flex gap-2">
                    <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="ghost" size="icon">
                          <Smile className="w-5 h-5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <EmojiPicker
                          onEmojiClick={(emojiData: EmojiClickData) => {
                            setNewMessage((prev) => prev + emojiData.emoji);
                            setShowEmojiPicker(false);
                            inputRef.current?.focus();
                          }}
                          previewConfig={{ showPreview: false }}
                          skinTonesDisabled
                        />
                      </PopoverContent>
                    </Popover>
                    <Input
                      ref={inputRef}
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" size="icon">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">
                Select a conversation to start chatting
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

