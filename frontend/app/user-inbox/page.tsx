'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getSocket, initSocket } from '@/lib/socket';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Send, ArrowLeft, Smile, Ban, Flag } from 'lucide-react';
import { toast } from 'sonner';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

interface InboxMessage {
  _id: string;
  senderType: 'admin' | 'user';
  anonymousUserId: string;
  messageText: string;
  isRead: boolean;
  createdAt: string;
}

export default function UserInboxPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [anonymousUserId, setAnonymousUserId] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false); // User is blocked by admin
  const [hasBlockedAdmin, setHasBlockedAdmin] = useState(false); // User has blocked admin
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [adminId, setAdminId] = useState<string | null>(null); // Cache admin ID
  const hasBlockedAdminRef = useRef(false); // Ref to track current block status
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
      return;
    }
    if (user) {
      // Load admin ID and block status, then fetch messages
      const initialize = async () => {
        await loadAdminId();
        await checkBlockStatus();
        fetchMessages();
      };
      initialize();
      setupSocket();
    }
  }, [user, loading, router]);

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

    socket.off('new-inbox-message');
    socket.on('new-inbox-message', (message: InboxMessage) => {
      // Only add if it's for this user or from admin
      if (message.userId === user?.id || message.senderType === 'admin') {
        // Use ref to check current block status (not closure state)
        if (hasBlockedAdminRef.current && message.senderType === 'admin') {
          return; // Don't add admin messages if blocked
        }
        
        if (isBlocked) {
          return; // Don't add if user is blocked
        }
        
        setMessages((prev) => {
          const filtered = prev.filter(m => 
            !m._id?.toString().startsWith('temp-') || m.messageText !== message.messageText
          );
          const exists = filtered.some(m => m._id === message._id);
          if (exists) return filtered;
          return [...filtered, message];
        });
        
        // Refetch to ensure proper filtering based on current state
        setTimeout(() => fetchMessages(), 50);
      }
    });

    socket.off('inbox-message-sent');
    socket.on('inbox-message-sent', (message: InboxMessage) => {
      if (message.userId === user?.id) {
        setMessages((prev) => {
          const filtered = prev.filter(m => 
            !m._id?.toString().startsWith('temp-') || m.messageText !== message.messageText
          );
          const exists = filtered.some(m => m._id === message._id);
          if (exists) return filtered;
          return [...filtered, message];
        });
        
        // Refetch to ensure proper filtering
        setTimeout(() => fetchMessages(), 100);
      }
    });

    socket.off('error');
    socket.on('error', (error: any) => {
      if (error.message?.includes('blocked')) {
        if (error.message?.includes('You have blocked')) {
          toast.error('Cannot send message. You have blocked the admin.');
          setHasBlockedAdmin(true);
        } else {
          toast.error('Cannot send message. You are blocked.');
          setIsBlocked(true);
        }
        // Remove any temp messages
        setMessages((prev) => prev.filter(m => !m._id?.toString().startsWith('temp-')));
      }
    });

    // Listen for real-time block/unblock events (only for admin blocking user, not user blocking admin)
    socket.off('user-blocked');
    socket.on('user-blocked', async (data: any) => {
      // Only update if admin blocked the current user (not if user blocked admin)
      const currentAdminId = adminId || await loadAdminId();
      if (data.blockedUser === user?.id && data.blockedBy === currentAdminId) {
        setIsBlocked(true);
        // Filter out messages immediately
        setMessages((prev) => prev.filter((msg) => msg.senderType === 'user'));
      }
    });

    socket.off('user-unblocked');
    socket.on('user-unblocked', async (data: any) => {
      // If user unblocked admin, update status and reload messages
      const currentAdminId = adminId || await loadAdminId();
      if (data.unblockedBy === user?.id && data.unblockedUser === currentAdminId) {
        setHasBlockedAdmin(false);
        hasBlockedAdminRef.current = false;
        // Fetch all messages (ref is now false, so all messages will show)
        await fetchMessages();
      }
      // If admin unblocked the current user
      if (data.unblockedUser === user?.id && data.unblockedBy === currentAdminId) {
        setIsBlocked(false);
        // Reload messages to show all messages
        await fetchMessages();
      }
    });
  };

  const fetchMessages = async (forceShowAll: boolean = false) => {
    try {
      const response = await api.get('/inbox/user');
      // Use ref to get current state (not closure state)
      // Filter out admin messages if user has blocked admin (unless forceShowAll is true)
      const shouldFilter = !forceShowAll && hasBlockedAdminRef.current;
      const filteredMessages = shouldFilter
        ? response.data.messages.filter((msg: InboxMessage) => msg.senderType !== 'admin')
        : response.data.messages;
      setMessages(filteredMessages);
      setAnonymousUserId(response.data.anonymousUserId);
    } catch (err: any) {
      console.error('Failed to fetch messages:', err);
      toast.error('Failed to load messages');
    }
  };

  const loadAdminId = async () => {
    if (adminId) return adminId; // Return cached if available
    try {
      const response = await api.get('/auth/admin-id');
      setAdminId(response.data.adminId);
      return response.data.adminId;
    } catch (err: any) {
      console.error('Failed to load admin ID:', err);
      return null;
    }
  };

  const checkBlockStatus = async () => {
    try {
      const currentAdminId = adminId || await loadAdminId();
      if (!currentAdminId) {
        setIsBlocked(false);
        setHasBlockedAdmin(false);
        hasBlockedAdminRef.current = false;
        return;
      }
      const response = await api.get(`/block/check/${currentAdminId}`);
      const blockedByThem = response.data.blockedByThem || false;
      const blockedByMe = response.data.blockedByMe || false;
      setIsBlocked(blockedByThem); // Admin has blocked user
      setHasBlockedAdmin(blockedByMe); // User has blocked admin
      hasBlockedAdminRef.current = blockedByMe; // Update ref
    } catch (err: any) {
      setIsBlocked(false);
      setHasBlockedAdmin(false);
      hasBlockedAdminRef.current = false;
    }
  };

  const handleBlockAdmin = async () => {
    try {
      const currentAdminId = adminId || await loadAdminId();
      if (!currentAdminId) {
        toast.error('Failed to get admin ID');
        return;
      }
      
      // Make API call first
      await api.post('/block/block', { userId: currentAdminId });
      
      // Update state and ref
      setHasBlockedAdmin(true);
      hasBlockedAdminRef.current = true;
      toast.success('Admin blocked successfully');
      
      // Filter messages immediately
      setMessages((prev) => prev.filter((msg) => msg.senderType !== 'admin'));
      
      // Verify block status
      await checkBlockStatus();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to block admin');
      // Reload to get correct state
      await checkBlockStatus();
      fetchMessages();
    }
  };

  const handleUnblockAdmin = async () => {
    try {
      const currentAdminId = adminId || await loadAdminId();
      if (!currentAdminId) {
        toast.error('Failed to get admin ID');
        return;
      }
      
      // Make API call first
      await api.post('/block/unblock', { userId: currentAdminId });
      
      // Update state and ref immediately
      setHasBlockedAdmin(false);
      hasBlockedAdminRef.current = false;
      toast.success('Admin unblocked successfully');
      
      // Fetch all messages (ref is now false, so all messages will show)
      await fetchMessages();
      
      // Verify block status to ensure consistency
      await checkBlockStatus();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to unblock admin');
      // Reload to get correct state
      await checkBlockStatus();
      fetchMessages();
    }
  };

  const handleReportAdmin = async () => {
    if (!reportReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    
    try {
      // Get admin user ID from backend
      const adminResponse = await api.get('/auth/admin-id');
      const adminUserId = adminResponse.data.adminId;
      
      await api.post('/block/report', {
        userId: adminUserId,
        reason: reportReason,
        description: reportDescription
      });
      toast.success('Admin reported successfully');
      setShowReportDialog(false);
      setReportReason('');
      setReportDescription('');
    } catch (err: any) {
      // If admin ID endpoint doesn't exist, try to find from messages
      if (err.response?.status === 404) {
        // Fallback: report with a special flag
        await api.post('/block/report', {
          userId: 'admin',
          reason: reportReason,
          description: reportDescription,
          isAdmin: true
        });
        toast.success('Admin reported successfully');
        setShowReportDialog(false);
        setReportReason('');
        setReportDescription('');
      } else {
        toast.error(err.response?.data?.message || 'Failed to report admin');
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    // Check if blocked BEFORE any optimistic update
    if (isBlocked) {
      toast.error('Cannot send message. You are blocked.');
      setNewMessage(''); // Clear input
      return;
    }

    // Check if user has blocked admin
    if (hasBlockedAdmin) {
      toast.error('Cannot send message. You have blocked the admin.');
      setNewMessage(''); // Clear input
      return;
    }

    const messageText = newMessage.trim();
    setNewMessage('');

    // Optimistic UI update
    const tempMessage: InboxMessage = {
      _id: `temp-${Date.now()}`,
      userId: user?.id || '',
      senderType: 'user',
      anonymousUserId: anonymousUserId || 'User',
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
          // Remove temp message
          setMessages((prev) => prev.filter(m => m._id !== tempMessage._id));
          return;
        }
      }

      // Quick check using cached state (backend will validate anyway)
      if (isBlocked || hasBlockedAdmin) {
        toast.error(isBlocked 
          ? 'Cannot send message. You are blocked.'
          : 'Cannot send message. You have blocked the admin.'
        );
        setMessages((prev) => prev.filter(m => m._id !== tempMessage._id));
        return;
      }

      socket.emit('send-inbox-message', {
        userId: user?.id,
        messageText
      });

      // No need to refetch - socket will send the message back via 'inbox-message-sent'
    } catch (err: any) {
      // Check if error is due to blocking
      if (err.response?.data?.message?.includes('blocked')) {
        const errorMsg = err.response.data.message;
        if (errorMsg.includes('You have blocked')) {
          toast.error('Cannot send message. You have blocked the admin.');
          setHasBlockedAdmin(true);
        } else {
          toast.error('Cannot send message. You are blocked.');
          setIsBlocked(true);
        }
      } else {
        toast.error('Failed to send message');
      }
      // Remove temp message on error
      setMessages((prev) => prev.filter(m => m._id !== tempMessage._id));
      fetchMessages();
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

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      <div className="border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/groups')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                Chat with Admin
              </h1>
              <p className="text-sm text-muted-foreground">
                You are: {anonymousUserId}
              </p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {hasBlockedAdmin ? (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleUnblockAdmin}
                className="flex items-center gap-2"
              >
                <Ban className="w-4 h-4" />
                <span>Unblock Admin</span>
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleBlockAdmin}
                className="flex items-center gap-2"
              >
                <Ban className="w-4 h-4" />
                <span>Block Admin</span>
              </Button>
            )}
            <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Flag className="w-4 h-4" />
                  <span>Report</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Report Admin</DialogTitle>
                  <DialogDescription>
                    Report the admin for inappropriate behavior
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason *</Label>
                    <Input
                      id="reason"
                      placeholder="e.g., Harassment, Unprofessional behavior"
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
                    <Button onClick={handleReportAdmin}>
                      Submit Report
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No messages yet. Start a conversation with admin!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isUser = message.senderType === 'user';
              return (
                <div
                  key={message._id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    isUser
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
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {(isBlocked || hasBlockedAdmin) && (
        <div className="border-t border-border p-4 bg-destructive/10">
          <p className="text-sm text-destructive text-center">
            {isBlocked 
              ? 'You are blocked. You cannot send messages.'
              : 'You have blocked the admin. You cannot send or receive messages.'
            }
          </p>
        </div>
      )}
      {!isBlocked && !hasBlockedAdmin && (
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
    </div>
  );
}

