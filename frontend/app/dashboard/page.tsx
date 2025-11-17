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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogOut, Plus, Users, Target, MessageCircle, Flag } from 'lucide-react';
import { toast } from 'sonner';

interface Group {
  _id: string;
  name: string;
  code: string;
  description: string;
  members: Array<{ anonymousName: string }>;
  createdAt: string;
}

interface Announcement {
  _id: string;
  groupId: string;
  groupName: string;
  groupCode: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');

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

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await api.post('/groups/create', {
        name: groupName,
        description: groupDescription,
      });
      toast.success(`Group created! Code: ${response.data.group.code}`);
      setGroupName('');
      setGroupDescription('');
      setCreateDialogOpen(false);
      // Refresh groups to get updated data
      await fetchGroups();
      
      // Ask if admin wants to create announcement
      setTimeout(() => {
        if (confirm(`Do you want to post an announcement for "${response.data.group.name}"?`)) {
          handleCreateAnnouncement(response.data.group.id);
        }
      }, 500);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create group');
    }
  };

  const handleCreateAnnouncement = async (groupId: string) => {
    try {
      await api.post('/announcements/create', { groupId });
      toast.success('Announcement posted!');
      await fetchAnnouncements();
      await fetchGroups(); // Refresh groups to show updated data
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create announcement');
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinDialogOpen(false);

    try {
      const response = await api.post('/groups/join', { code: joinCode });
      toast.success('Successfully joined group!');
      setJoinCode('');
      fetchGroups();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to join group');
    }
  };

  const handleJoinFromAnnouncement = async (groupId: string, groupName: string, groupCode: string) => {
    try {
      const response = await api.post('/groups/join', { code: groupCode });
      toast.success(`Joined ${groupName} successfully!`);
      fetchGroups();
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

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">Create and manage groups</p>
          </div>
          <div className="flex gap-2 items-center">
            <Link href="/groups">
              <Button variant="outline">My Groups</Button>
            </Link>
            <Link href="/dashboard/reports">
              <Button variant="outline">
                <Flag className="w-4 h-4 mr-2" />
                Reports
              </Button>
            </Link>
            <ThemeToggle />
            <Button onClick={handleSignOut} variant="outline">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="h-24">
                <Plus className="w-5 h-5 mr-2" />
                Create New Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
                <DialogDescription>
                  Create a new anonymous chat group
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="group-name">Group Name</Label>
                  <Input
                    id="group-name"
                    placeholder="My Group"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="group-description">Description (optional)</Label>
                  <Input
                    id="group-description"
                    placeholder="Group description"
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full">
                  Create Group
                </Button>
              </form>
            </DialogContent>
          </Dialog>

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

          <Link href="/inbox">
            <Card className="cursor-pointer hover:border-accent transition-colors h-24">
              <CardContent className="flex items-center justify-center h-full p-6">
                <MessageCircle className="w-5 h-5 mr-2" />
                <span className="text-lg font-medium">Chatbot</span>
              </CardContent>
            </Card>
          </Link>
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
          <h2 className="text-2xl font-semibold text-foreground mb-4">All Groups</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <Card key={group._id}>
                <CardHeader>
                  <CardTitle>{group.name}</CardTitle>
                  <CardDescription>Code: {group.code}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    Members: {group.members?.length || 0}
                  </p>
                  {group.members && group.members.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-2">Anonymous Members:</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {group.members.map((member: any, idx: number) => (
                          <li key={idx}>• {member.anonymousName}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(!group.members || group.members.length === 0) && (
                    <p className="text-sm text-muted-foreground mb-4">No members joined yet</p>
                  )}
                  <div className="flex gap-2 mb-2">
                    <Link href={`/groups/${group._id}`} className="w-full">
                      <Button className="w-full" variant="outline">View Chat</Button>
                    </Link>
                  </div>
                  {!announcements.some(a => a.groupId === group._id) && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleCreateAnnouncement(group._id)}
                    >
                      Post Announcement
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
            {groups.length === 0 && (
              <p className="text-muted-foreground col-span-full text-center py-8">
                No groups created yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
