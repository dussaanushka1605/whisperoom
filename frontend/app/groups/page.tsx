'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogOut, Users, Target, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Group {
  _id: string;
  name: string;
  code: string;
  description: string;
  userAnonymousName?: string;
  members: Array<{ anonymousName: string }>;
}

interface Announcement {
  _id: string;
  groupId: string;
  groupName: string;
  groupCode: string;
  createdAt: string;
}

export default function GroupsPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
    if (user) {
      fetchGroups();
      fetchAnnouncements();
    }
  }, [user, loading, router]);

  const fetchGroups = async () => {
    try {
      const response = await api.get('/groups/all');
      setGroups(response.data.groups || []);
    } catch (err: any) {
      console.error('Error fetching groups:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch groups';
      toast.error(errorMessage);
      // Set empty array on error to prevent UI issues
      setGroups([]);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const response = await api.get('/announcements/all');
      setAnnouncements(response.data.announcements);
    } catch (err: any) {
      console.error('Failed to fetch announcements:', err);
    }
  };

  const handleJoinFromAnnouncement = async (groupId: string, groupName: string, groupCode: string) => {
    try {
      const response = await api.post('/groups/join', { code: groupCode });
      toast.success(`Joined ${groupName} successfully!`);
      // Refresh groups to get updated member counts
      await fetchGroups();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to join group');
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinDialogOpen(false);

    try {
      const response = await api.post('/groups/join', { code: joinCode });
      toast.success('Successfully joined group!');
      setJoinCode('');
      // Refresh groups to get updated member counts
      await fetchGroups();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to join group');
    }
  };

  const handleSignOut = () => {
    logout();
    router.push('/');
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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {user.role === 'admin' ? 'Admin Dashboard' : 'My Groups'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {user.role === 'admin' ? 'Create and manage groups' : 'Join and chat in groups'}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <ThemeToggle />
            {user.role === 'admin' && (
              <Link href="/dashboard">
                <Button variant="outline">Admin Dashboard</Button>
              </Link>
            )}
            <Button onClick={handleSignOut} variant="outline">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:border-accent transition-colors">
                <CardContent className="flex items-center justify-center h-24 p-6">
                  <Users className="w-5 h-5 mr-2" />
                  <span className="text-lg font-medium">Join Group</span>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join Group</DialogTitle>
                <DialogDescription>
                  Enter the group code to join
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleJoinGroup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="join-code">Group Code</Label>
                  <Input
                    id="join-code"
                    placeholder="ABC123"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Join Group
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Admin Announcements Section */}
        {announcements.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <span>📢</span> Admin Announcements
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {announcements.map((announcement) => (
                <Card key={announcement._id} className="border-accent/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-pink-500" />
                      {announcement.groupName}
                    </CardTitle>
                    <CardDescription>
                      Group Code: <span className="font-mono text-lg font-bold text-accent">{announcement.groupCode}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Posted {new Date(announcement.createdAt).toLocaleDateString()} at {new Date(announcement.createdAt).toLocaleTimeString()}
                    </p>
                    <Button
                      className="w-full"
                      onClick={() => handleJoinFromAnnouncement(announcement.groupId, announcement.groupName, announcement.groupCode)}
                    >
                      Join Group
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            {user.role === 'admin' ? 'My Joined Groups' : 'My Groups'}
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <Card
                key={group._id}
                className="cursor-pointer hover:border-accent transition-colors"
                onClick={() => router.push(`/groups/${group._id}`)}
              >
                <CardHeader>
                  <CardTitle>{group.name}</CardTitle>
                  <CardDescription>
                    Your alias: {group.userAnonymousName || 'Admin'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">Open Chat</Button>
                </CardContent>
              </Card>
            ))}
            {groups.length === 0 && (
              <p className="text-muted-foreground col-span-full text-center py-8">
                You haven't joined any groups yet
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Floating Inbox Button */}
      {user.role === 'admin' ? (
        <Link href="/inbox">
          <Button
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
            size="icon"
            title="Open Admin Inbox"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        </Link>
      ) : (
        <Link href="/user-inbox">
          <Button
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
            size="icon"
            title="Chat with Admin"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        </Link>
      )}
    </div>
  );
}
