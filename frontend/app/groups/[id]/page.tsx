'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getSocket, initSocket } from '@/lib/socket';
import api from '@/lib/api';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Send, Smile, Ban, Flag, UserMinus, Upload, Download, Palette, Clock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { toast } from 'sonner';

interface Message {
  _id: string;
  anonymousName: string;
  content: string;
  createdAt: string;
  userId?: string;
  isFile?: boolean;
  fileName?: string;
  fileContent?: string;
  fileSize?: number;
  autoDelete?: {
    enabled: boolean;
    deleteAfter: number | null;
    expiresAt: string | null;
    isDeleted?: boolean;
    deletedAt?: string | null;
  };
}

// Auto-delete timer component
function AutoDeleteTimer({ expiresAt, messageId }: { expiresAt: string | null, messageId: string }) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const now = Date.now();
      const expiry = new Date(expiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expiry - now) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!expiresAt || timeLeft <= 0) {
    return (
      <div className="flex items-center gap-1 text-xs opacity-70">
        <Clock className="w-3 h-3" />
        <span>Auto-deletes</span>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  return (
    <div className="flex items-center gap-1 text-xs opacity-70">
      <Clock className="w-3 h-3" />
      <span>Deletes in {formatTime(timeLeft)}</span>
    </div>
  );
}

export default function GroupChatPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [group, setGroup] = useState<any>(null);
  const [anonymousName, setAnonymousName] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set()); // Users I have blocked
  const [usersWhoBlockedMe, setUsersWhoBlockedMe] = useState<Set<string>>(new Set()); // Users who blocked me
  const [allUsersInGroup, setAllUsersInGroup] = useState<Array<{userId: string, anonymousName: string}>>([]);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportUserId, setReportUserId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [showBlockedUsersDialog, setShowBlockedUsersDialog] = useState(false);
  const [blockedUsersList, setBlockedUsersList] = useState<Array<{userId: string, anonymousName: string}>>([]);
  const [groupTheme, setGroupTheme] = useState<string>('default');
  const [showThemeDialog, setShowThemeDialog] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string>('default');
  const [autoDeleteEnabled, setAutoDeleteEnabled] = useState(false);
  const [autoDeleteTime, setAutoDeleteTime] = useState<number>(60); // Default 60 seconds
  const [showAutoDeleteMenu, setShowAutoDeleteMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
      return;
    }
    if (user && groupId) {
      const initialize = async () => {
        await fetchGroup();
        await fetchBlockedUsers();
        fetchMessages();
        fetchAllUsersFromMessages();
      };
      initialize();
      setupSocket();
    }

    return () => {
      const socket = getSocket();
      if (socket) {
        socket.emit('leave-group', groupId);
      }
    };
  }, [user, loading, groupId, router]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchGroup = async () => {
    try {
      const response = await api.get(`/groups/${groupId}`);
      setGroup(response.data.group);
      setAnonymousName(response.data.group.userAnonymousName || 'Admin');
      setMemberCount(response.data.group.members?.length || 0);
      setGroupTheme(response.data.group.theme || 'default');
      setSelectedTheme(response.data.group.theme || 'default');
      
      // Extract all users from group members
      if (response.data.group.members) {
        const users = response.data.group.members
          .filter((m: any) => m.userId)
          .map((m: any) => ({
            userId: m.userId.toString(),
            anonymousName: m.anonymousName
          }));
        setAllUsersInGroup(prev => {
          const userMap = new Map(prev.map(u => [u.userId, u]));
          users.forEach((u: any) => userMap.set(u.userId, u));
          return Array.from(userMap.values());
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch group:', err);
      if (err.response?.status === 403 && err.response?.data?.message?.includes('removed')) {
        toast.error('You have been removed from this group');
        router.push('/groups');
      }
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await api.get(`/messages/group/${groupId}`);
      // Backend already filters based on mutual blocking, but we'll also filter on frontend for safety
      const filteredMessages = response.data.messages.filter((message: Message) => {
        // Don't show messages that are marked as deleted
        if (message.autoDelete?.isDeleted) {
          return false;
        }
        if (!message.userId) return true;
        const messageUserId = message.userId.toString();
        // Don't show messages from users I blocked
        if (blockedUsers.has(messageUserId)) return false;
        // Don't show messages from users who blocked me
        if (usersWhoBlockedMe.has(messageUserId)) return false;
        return true;
      });
      setMessages(filteredMessages);
    } catch (err: any) {
      console.error('Failed to fetch messages:', err);
      if (err.response?.status === 403 && err.response?.data?.message?.includes('removed')) {
        toast.error('You have been removed from this group');
        router.push('/groups');
      }
    }
  };

  const fetchAllUsersFromMessages = async () => {
    try {
      const response = await api.get(`/messages/group/${groupId}`);
      const userMap = new Map<string, string>();
      
      // Check if admin sent messages and get admin ID once
      const hasAdminMessages = response.data.messages.some((msg: any) => msg.anonymousName === 'Admin');
      if (hasAdminMessages) {
        try {
          const adminResponse = await api.get('/auth/admin-id');
          userMap.set(adminResponse.data.adminId, 'Admin');
        } catch (err) {
          userMap.set('admin', 'Admin');
        }
      }
      
      // Add all users from messages
      response.data.messages.forEach((msg: any) => {
        if (msg.userId) {
          userMap.set(msg.userId.toString(), msg.anonymousName);
        }
      });
      
      // Add group members
      if (group?.members) {
        group.members.forEach((m: any) => {
          if (m.userId) {
            userMap.set(m.userId.toString(), m.anonymousName);
          }
        });
      }
      
      const users = Array.from(userMap.entries()).map(([userId, anonymousName]) => ({
        userId,
        anonymousName
      }));
      
      setAllUsersInGroup(users);
    } catch (err: any) {
      console.error('Failed to fetch users from messages:', err);
    }
  };

  const fetchBlockedUsers = async () => {
    try {
      // Get users I have blocked
      const blockedResponse = await api.get('/block/blocked');
      const blockedSet = new Set(blockedResponse.data.blockedUsers.map((b: any) => b.blockedUserId));
      
      // Get users who blocked me
      const usersWhoBlockedMeSet = new Set<string>();
      
      // Check each user in the group to see if they blocked me
      if (group?.members && user?.id) {
        for (const member of group.members) {
          if (member.userId && member.userId.toString() !== user.id) {
            try {
              const checkResponse = await api.get(`/block/check/${member.userId}`);
              if (checkResponse.data.blockedByThem) {
                usersWhoBlockedMeSet.add(member.userId.toString());
              }
            } catch (err) {
              // Continue checking other members
            }
          }
        }
      }
      
      // Check if admin blocked me
      try {
        const adminResponse = await api.get('/auth/admin-id');
        const adminId = adminResponse.data.adminId;
        const adminCheck = await api.get(`/block/check/${adminId}`);
        if (adminCheck.data.blockedByThem) {
          usersWhoBlockedMeSet.add(adminId);
          usersWhoBlockedMeSet.add('admin');
        }
      } catch (err) {
        // Continue
      }
      
      setBlockedUsers(blockedSet);
      setUsersWhoBlockedMe(usersWhoBlockedMeSet);
      
      // Build blocked users list for dialog
      const blockedList: Array<{userId: string, anonymousName: string}> = [];
      for (const blockedUserId of blockedSet) {
        const found = allUsersInGroup.find(u => u.userId === blockedUserId) ||
                     group?.members?.find((m: any) => m.userId && m.userId.toString() === blockedUserId);
        if (found) {
          blockedList.push({ 
            userId: blockedUserId, 
            anonymousName: found.anonymousName || found.anonymousName 
          });
        } else if (blockedUserId === 'admin' || blockedUserId.includes('admin')) {
          blockedList.push({ userId: blockedUserId, anonymousName: 'Admin' });
        }
      }
      setBlockedUsersList(blockedList);
    } catch (err: any) {
      console.error('Failed to fetch blocked users:', err);
    }
  };

  const handleBlockUser = async (userId: string) => {
    try {
      let targetUserId = userId;
      if (userId === 'admin') {
        const adminResponse = await api.get('/auth/admin-id');
        targetUserId = adminResponse.data.adminId;
      }
      
      await api.post('/block/block', { userId: targetUserId });
      toast.success('User blocked successfully');
      setBlockedUsers(prev => new Set([...prev, targetUserId]));
      if (userId === 'admin') {
        setBlockedUsers(prev => new Set([...prev, 'admin']));
      }
      await fetchBlockedUsers();
      fetchMessages(); // Reload messages to hide blocked user's messages
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to block user');
    }
  };

  const handleUnblockUser = async (userId: string) => {
    try {
      let targetUserId = userId;
      if (userId === 'admin') {
        const adminResponse = await api.get('/auth/admin-id');
        targetUserId = adminResponse.data.adminId;
      }
      
      await api.post('/block/unblock', { userId: targetUserId });
      toast.success('User unblocked successfully');
      setBlockedUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetUserId);
        if (userId === 'admin') {
          newSet.delete('admin');
        }
        return newSet;
      });
      await fetchBlockedUsers();
      fetchMessages(); // Reload messages to show unblocked user's messages
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to unblock user');
    }
  };

  const handleReportUser = async () => {
    if (!reportUserId || !reportReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    
    try {
      let targetUserId = reportUserId;
      if (reportUserId === 'admin') {
        const adminResponse = await api.get('/auth/admin-id');
        targetUserId = adminResponse.data.adminId;
      }
      
      await api.post('/block/report', {
        userId: targetUserId,
        reason: reportReason,
        description: reportDescription
      });
      toast.success('User reported successfully');
      setShowReportDialog(false);
      setReportUserId(null);
      setReportReason('');
      setReportDescription('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to report user');
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user from the group? They will lose access to all group messages.')) {
      return;
    }
    
    try {
      await api.post(`/groups/${groupId}/remove-user`, { userId });
      toast.success('User removed from group successfully');
      await fetchGroup();
      fetchMessages();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove user');
    }
  };

  const getUserFromMessage = (anonymousName: string, userId?: string) => {
    // First try to find by userId if available
    if (userId && group?.members) {
      const found = group.members.find((m: any) => m.userId && m.userId.toString() === userId.toString());
      if (found) return found;
    }
    
    // Fallback to finding by anonymousName
    if (group?.members) {
      return group.members.find((m: any) => m.anonymousName === anonymousName);
    }
    
    // Check in allUsersInGroup
    if (anonymousName === 'Admin') {
      return { userId: 'admin', anonymousName: 'Admin' };
    }
    
    const found = allUsersInGroup.find(u => u.anonymousName === anonymousName);
    if (found) {
      return { userId: found.userId, anonymousName: found.anonymousName };
    }
    
    return null;
  };


  const setupSocket = () => {
    let socket = getSocket();
    if (!socket || !socket.connected) {
      const token = sessionStorage.getItem('token');
      if (token) {
        socket = initSocket(token);
      } else {
        return;
      }
    }

    socket.emit('join-group', groupId);

    socket.on('joined-group', (data: { anonymousName: string }) => {
      setAnonymousName(data.anonymousName);
    });

    socket.on('new-message', (message: Message) => {
      // Don't add messages if the sender is the current user (they'll get it via message-sent)
      if (message.userId === user?.id) {
        return;
      }
      
      // Don't show messages that are marked as deleted
      if (message.autoDelete?.isDeleted) {
        return;
      }
      
      // Check if message is from a blocked user or user who blocked me
      if (message.userId) {
        const messageUserId = message.userId.toString();
        if (blockedUsers.has(messageUserId) || usersWhoBlockedMe.has(messageUserId)) {
          return; // Don't add blocked messages
        }
      }
      
      setMessages((prev) => {
        // Check if message already exists to prevent duplicates
        const exists = prev.some(m => m._id === message._id);
        if (exists) return prev;
        return [...prev, message];
      });
      
      // Update users list when new message arrives
      fetchAllUsersFromMessages();
    });

    socket.on('message-sent', (message: Message) => {
      // Add message from server (sender's own message)
      setMessages((prev) => {
        // Check if message already exists to prevent duplicates
        const exists = prev.some(m => m._id === message._id);
        if (exists) return prev;
        return [...prev, message];
      });
    });

    socket.on('member-count-updated', (data: { memberCount: number, members: Array<{ anonymousName: string, userId?: string }> }) => {
      setMemberCount(data.memberCount);
      // Update group members if needed
      if (group) {
        setGroup({ ...group, members: data.members });
      }
      // Update users list when members change
      fetchGroup();
    });

    socket.on('user-joined', (data: { anonymousName: string, userId?: string }) => {
      // Update users list when new user joins
      fetchGroup();
    });

    socket.on('error', (error: { message: string }) => {
      console.error('Socket error:', error);
      if (error.message?.includes('removed')) {
        toast.error('You have been removed from this group');
        router.push('/groups');
      } else {
        toast.error(error.message || 'An error occurred');
      }
    });

    // Listen for user removal
    socket.on('removed-from-group', (data: { groupId: string, groupName: string }) => {
      if (data.groupId === groupId) {
        toast.error(`You have been removed from ${data.groupName}`);
        router.push('/groups');
      }
    });

    // Listen for block/unblock updates
    socket.on('user-blocked-update', async () => {
      await fetchBlockedUsers();
      fetchMessages();
    });

    socket.on('user-unblocked-update', async () => {
      await fetchBlockedUsers();
      fetchMessages();
    });

    // Listen for theme updates
    socket.on('theme-updated', (data: { groupId: string, theme: string }) => {
      if (data.groupId === groupId) {
        setGroupTheme(data.theme);
        setSelectedTheme(data.theme);
      }
    });

    // Listen for auto-deleted messages
    socket.on('messages-deleted', (data: { messageIds: string[], groupId: string }) => {
      if (data.groupId === groupId) {
        setMessages((prev) => prev.filter(m => !data.messageIds.includes(m._id)));
      }
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    // Check if trying to send to blocked users (backend will also check, but this prevents unnecessary sends)
    // Note: We can't check all recipients here, so backend validation is the source of truth

    const messageContent = newMessage.trim();
    setNewMessage('');
    setShowEmojiPicker(false);

    let socket = getSocket();
    if (!socket || !socket.connected) {
      const token = sessionStorage.getItem('token');
      if (token) {
        socket = initSocket(token);
      } else {
        return;
      }
    }

    socket.emit('send-message', {
      groupId,
      content: messageContent,
      autoDelete: {
        enabled: autoDeleteEnabled,
        deleteAfter: autoDeleteEnabled ? autoDeleteTime : null
      }
    });
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage((prev) => prev + emojiData.emoji);
    inputRef.current?.focus();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Only allow text files
    if (!file.type.startsWith('text/') && !file.name.endsWith('.txt') && !file.name.endsWith('.md') && !file.name.endsWith('.json') && !file.name.endsWith('.js') && !file.name.endsWith('.ts') && !file.name.endsWith('.tsx') && !file.name.endsWith('.jsx') && !file.name.endsWith('.css') && !file.name.endsWith('.html') && !file.name.endsWith('.xml')) {
      toast.error('Only text files are allowed');
      return;
    }

    // Limit file size to 100KB
    if (file.size > 100 * 1024) {
      toast.error('File size must be less than 100KB');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fileContent = event.target?.result as string;
        
        let socket = getSocket();
        if (!socket || !socket.connected) {
          const token = sessionStorage.getItem('token');
          if (token) {
            socket = initSocket(token);
          } else {
            toast.error('Connection error');
            return;
          }
        }

        socket.emit('send-message', {
          groupId,
          content: `Shared file: ${file.name}`,
          isFile: true,
          fileName: file.name,
          fileContent: fileContent,
          fileSize: file.size,
          autoDelete: {
            enabled: autoDeleteEnabled,
            deleteAfter: autoDeleteEnabled ? autoDeleteTime : null
          }
        });

        toast.success('File shared successfully');
      };
      reader.onerror = () => {
        toast.error('Failed to read file');
      };
      reader.readAsText(file);
    } catch (err: any) {
      toast.error('Failed to upload file');
    }

    // Reset file input
    if (fileInput.current) {
      fileInput.current.value = '';
    }
  };

  const handleDownloadFile = (message: Message) => {
    if (!message.fileContent || !message.fileName) return;

    const blob = new Blob([message.fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = message.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleThemeChange = async () => {
    try {
      await api.put(`/groups/${groupId}/theme`, { theme: selectedTheme });
      setGroupTheme(selectedTheme);
      setShowThemeDialog(false);
      toast.success('Theme updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update theme');
    }
  };

  // Theme color mapping
  const themeColors: Record<string, { bg: string; text: string; border: string; primary: string; messageText: string }> = {
    default: { bg: 'bg-background', text: 'text-foreground', border: 'border-border', primary: 'bg-primary', messageText: 'text-foreground' },
    blue: { bg: 'bg-blue-50 dark:bg-blue-950', text: 'text-blue-900 dark:text-blue-100', border: 'border-blue-200 dark:border-blue-800', primary: 'bg-blue-600', messageText: 'text-blue-900 dark:text-blue-100' },
    green: { bg: 'bg-green-50 dark:bg-green-950', text: 'text-green-900 dark:text-green-100', border: 'border-green-200 dark:border-green-800', primary: 'bg-green-600', messageText: 'text-green-900 dark:text-green-100' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-950', text: 'text-purple-900 dark:text-purple-100', border: 'border-purple-200 dark:border-purple-800', primary: 'bg-purple-600', messageText: 'text-purple-900 dark:text-purple-100' },
    orange: { bg: 'bg-orange-50 dark:bg-orange-950', text: 'text-orange-900 dark:text-orange-100', border: 'border-orange-200 dark:border-orange-800', primary: 'bg-orange-600', messageText: 'text-orange-900 dark:text-orange-100' },
    red: { bg: 'bg-red-50 dark:bg-red-950', text: 'text-red-900 dark:text-red-100', border: 'border-red-200 dark:border-red-800', primary: 'bg-red-600', messageText: 'text-red-900 dark:text-red-100' },
    pink: { bg: 'bg-pink-50 dark:bg-pink-950', text: 'text-pink-900 dark:text-pink-100', border: 'border-pink-200 dark:border-pink-800', primary: 'bg-pink-600', messageText: 'text-pink-900 dark:text-pink-100' },
    grey: { bg: 'bg-gray-50 dark:bg-gray-900', text: 'text-gray-900 dark:text-gray-100', border: 'border-gray-200 dark:border-gray-700', primary: 'bg-gray-600', messageText: 'text-gray-900 dark:text-gray-100' }
  };

  const currentTheme = themeColors[groupTheme] || themeColors.default;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  if (!user || !group) {
    return <div className="container">Loading group...</div>;
  }

  return (
    <div className={`h-screen ${currentTheme.bg} ${currentTheme.text} flex flex-col`}>
      <div className={`border-b ${currentTheme.border} p-4`}>
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
              <h1 className={`text-xl font-semibold ${currentTheme.text}`}>
                {group.name}
              </h1>
              <p className={`text-sm ${currentTheme.text} opacity-70`}>You are: {anonymousName} 😊</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <Dialog open={showBlockedUsersDialog} onOpenChange={setShowBlockedUsersDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Ban className="w-4 h-4" />
                  <span>Blocked ({blockedUsersList.length})</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Blocked Users</DialogTitle>
                  <DialogDescription>
                    Manage users you have blocked in this group
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {blockedUsersList.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      No users are blocked
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {blockedUsersList.map((blockedUser) => (
                        <div
                          key={blockedUser.userId}
                          className="flex items-center justify-between p-3 border border-border rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-foreground">
                              {blockedUser.anonymousName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {blockedUser.userId === 'admin' ? 'Admin' : `User ID: ${blockedUser.userId.substring(blockedUser.userId.length - 8)}`}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              handleUnblockUser(blockedUser.userId);
                              setShowBlockedUsersDialog(false);
                            }}
                            className="flex items-center gap-2"
                          >
                            <Ban className="w-4 h-4" />
                            Unblock
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
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
                    Report a user for inappropriate behavior in this group
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="report-user-select">Select User to Report</Label>
                    <select
                      id="report-user-select"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={reportUserId || ''}
                      onChange={(e) => setReportUserId(e.target.value)}
                    >
                      <option value="">Select a user...</option>
                      {allUsersInGroup
                        .filter((u) => u.userId && u.userId.toString() !== user?.id)
                        .map((userItem) => (
                          <option key={userItem.userId} value={userItem.userId}>
                            {userItem.anonymousName}
                          </option>
                        ))}
                    </select>
                  </div>
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
                        setReportUserId(null);
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
            <Dialog open={showThemeDialog} onOpenChange={setShowThemeDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    <span>Theme</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Group Theme</DialogTitle>
                    <DialogDescription>
                      Choose a theme for this group
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-4 gap-3">
                      {['default', 'blue', 'green', 'purple', 'orange', 'red', 'pink', 'grey'].map((theme) => (
                        <button
                          key={theme}
                          onClick={() => setSelectedTheme(theme)}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            selectedTheme === theme
                              ? 'border-primary ring-2 ring-primary ring-offset-2'
                              : 'border-border hover:border-primary/50'
                          }`}
                          style={{
                            backgroundColor: theme === 'default' ? 'hsl(var(--background))' :
                                          theme === 'blue' ? '#3b82f6' :
                                          theme === 'green' ? '#10b981' :
                                          theme === 'purple' ? '#8b5cf6' :
                                          theme === 'orange' ? '#f97316' :
                                          theme === 'red' ? '#ef4444' :
                                          theme === 'pink' ? '#ec4899' :
                                          theme === 'grey' ? '#6b7280' : 'transparent',
                            color: '#fff'
                          }}
                        >
                          <div className="text-xs font-medium capitalize">{theme}</div>
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowThemeDialog(false);
                          setSelectedTheme(groupTheme);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleThemeChange}>
                        Apply Theme
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages
            .filter((message) => {
              // Additional frontend filtering (backend already filters, but this is for safety)
              if (!message.userId) return true;
              const messageUserId = message.userId.toString();
              // Don't show messages from users I blocked
              if (blockedUsers.has(messageUserId)) return false;
              // Don't show messages from users who blocked me
              if (usersWhoBlockedMe.has(messageUserId)) return false;
              return true;
            })
            .map((message) => {
            const isMyMessage = message.anonymousName === anonymousName;
            const messageUser = getUserFromMessage(message.anonymousName, message.userId);
            const messageUserId = messageUser?.userId?.toString() || (message.anonymousName === 'Admin' ? 'admin' : null);
            const isBlocked = messageUserId ? blockedUsers.has(messageUserId) : false;
            
            return (
              <div
                key={message._id}
                className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} group`}
              >
                <div className={`max-w-[70%] rounded-lg px-4 py-2 ${
                  isMyMessage
                    ? 'bg-primary text-primary-foreground'
                    : `bg-secondary ${currentTheme.messageText}`
                }`} style={isMyMessage && groupTheme !== 'default' ? { backgroundColor: currentTheme.primary } : {}}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`text-sm font-medium ${isMyMessage ? 'text-primary-foreground' : currentTheme.messageText}`}>
                        {message.anonymousName}
                      </div>
                      {message.autoDelete?.enabled && isMyMessage && (
                        <AutoDeleteTimer 
                          expiresAt={message.autoDelete.expiresAt} 
                          messageId={message._id}
                        />
                      )}
                    </div>
                    {!isMyMessage && messageUserId && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Ban className="w-3 h-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-2">
                          <div className="space-y-1">
                            {isBlocked ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => handleUnblockUser(messageUserId)}
                              >
                                <Ban className="w-4 h-4 mr-2" />
                                Unblock
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => handleBlockUser(messageUserId)}
                              >
                                <Ban className="w-4 h-4 mr-2" />
                                Block
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => {
                                setReportUserId(messageUserId);
                                setShowReportDialog(true);
                              }}
                            >
                              <Flag className="w-4 h-4 mr-2" />
                              Report
                            </Button>
                            {user?.role === 'admin' && messageUserId !== user?.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-destructive"
                                onClick={() => handleRemoveUser(messageUserId)}
                              >
                                <UserMinus className="w-4 h-4 mr-2" />
                                Remove from Group
                              </Button>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                  {message.isFile ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-sm font-medium ${isMyMessage ? 'text-primary-foreground' : currentTheme.messageText}`}>{message.fileName}</p>
                          <p className={`text-xs ${isMyMessage ? 'text-primary-foreground opacity-70' : currentTheme.messageText + ' opacity-70'}`}>
                            {(message.fileSize || 0) > 1024 
                              ? `${(message.fileSize! / 1024).toFixed(2)} KB`
                              : `${message.fileSize} bytes`}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadFile(message)}
                          className="flex items-center gap-1"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </Button>
                      </div>
                      <div className={`mt-2 p-2 bg-background/50 rounded text-xs font-mono max-h-32 overflow-y-auto`}>
                        <pre className={`whitespace-pre-wrap break-words ${isMyMessage ? 'text-primary-foreground' : currentTheme.messageText}`}>{message.fileContent}</pre>
                      </div>
                    </div>
                  ) : (
                    <p className={`text-sm break-words ${isMyMessage ? 'text-primary-foreground' : currentTheme.messageText}`}>{message.content}</p>
                  )}
                  <p className={`text-xs opacity-70 mt-1 ${isMyMessage ? 'text-primary-foreground' : currentTheme.messageText}`}>
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            );
          })}
          {messages.length === 0 && (
            <div className={`text-center ${currentTheme.text} opacity-70 py-8`}>
              No messages yet. Start the conversation!
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      <div className={`border-t ${currentTheme.border} p-4`}>
        <form
          onSubmit={handleSendMessage}
          className="max-w-4xl mx-auto flex gap-2 items-center"
        >
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button type="button" size="icon" variant="ghost">
                <Smile className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0 border-0" side="top">
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                width={350}
                height={400}
              />
            </PopoverContent>
          </Popover>
          <input
            ref={fileInput}
            type="file"
            accept=".txt,.md,.json,.js,.ts,.tsx,.jsx,.css,.html,.xml,text/*"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload">
            <Button type="button" size="icon" variant="ghost" asChild>
              <span>
                <Upload className="w-5 h-5" />
              </span>
            </Button>
          </label>
          <Popover open={showAutoDeleteMenu} onOpenChange={setShowAutoDeleteMenu}>
            <PopoverTrigger asChild>
              <Button 
                type="button" 
                size="icon" 
                variant={autoDeleteEnabled ? "default" : "ghost"}
                className={autoDeleteEnabled ? "bg-orange-500 hover:bg-orange-600" : ""}
              >
                <Clock className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4" side="top">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-delete-toggle" className="text-sm font-medium">
                    Auto-delete message
                  </Label>
                  <input
                    type="checkbox"
                    id="auto-delete-toggle"
                    checked={autoDeleteEnabled}
                    onChange={(e) => setAutoDeleteEnabled(e.target.checked)}
                    className="rounded"
                  />
                </div>
                {autoDeleteEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="auto-delete-time" className="text-xs text-muted-foreground">
                      Delete after
                    </Label>
                    <select
                      id="auto-delete-time"
                      value={autoDeleteTime}
                      onChange={(e) => setAutoDeleteTime(Number(e.target.value))}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value={30}>30 seconds</option>
                      <option value={60}>1 minute</option>
                      <option value={300}>5 minutes</option>
                      <option value={600}>10 minutes</option>
                      <option value={1800}>30 minutes</option>
                      <option value={3600}>1 hour</option>
                      <option value={86400}>24 hours</option>
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Message will be deleted after {autoDeleteTime} seconds
                    </p>
                  </div>
                )}
              </div>
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
        </form>
      </div>
    </div>
  );
}
