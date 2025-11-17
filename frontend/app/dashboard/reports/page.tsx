'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface Report {
  _id: string;
  reportedByAnonymous: string;
  reportedUserAnonymous: string;
  reason: string;
  description: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  adminNotes?: string;
  createdAt: string;
}

export default function ReportsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);

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
      fetchReports();
    }
  }, [user, loading, router]);

  const fetchReports = async () => {
    try {
      const response = await api.get('/block/reports');
      setReports(response.data.reports);
    } catch (err: any) {
      console.error('Failed to fetch reports:', err);
      toast.error('Failed to load reports');
    }
  };

  const updateReportStatus = async (reportId: string, status: string) => {
    try {
      await api.patch(`/block/reports/${reportId}`, { status });
      toast.success('Report status updated');
      fetchReports();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update report');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500';
      case 'reviewed':
        return 'bg-blue-500';
      case 'resolved':
        return 'bg-green-500';
      case 'dismissed':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
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
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">User Reports</h1>
            <p className="text-muted-foreground mt-1">
              Review and manage user reports
            </p>
          </div>
        </div>

        {reports.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No reports yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <Card key={report._id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        Report #{report._id.substring(0, 8)}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Reported by: {report.reportedByAnonymous} | 
                        Reported user: {report.reportedUserAnonymous}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(report.status)}>
                      {report.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-1">Reason:</p>
                      <p className="text-sm text-foreground">{report.reason}</p>
                    </div>
                    {report.description && (
                      <div>
                        <p className="text-sm font-medium mb-1">Description:</p>
                        <p className="text-sm text-muted-foreground">{report.description}</p>
                      </div>
                    )}
                    {report.adminNotes && (
                      <div>
                        <p className="text-sm font-medium mb-1">Admin Notes:</p>
                        <p className="text-sm text-muted-foreground">{report.adminNotes}</p>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Reported on: {new Date(report.createdAt).toLocaleString()}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateReportStatus(report._id, 'reviewed')}
                        disabled={report.status === 'reviewed'}
                      >
                        Mark as Reviewed
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateReportStatus(report._id, 'resolved')}
                        disabled={report.status === 'resolved'}
                      >
                        Resolve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateReportStatus(report._id, 'dismissed')}
                        disabled={report.status === 'dismissed'}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

