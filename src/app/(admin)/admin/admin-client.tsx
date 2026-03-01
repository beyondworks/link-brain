'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, FileText, TrendingUp, Shield } from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  totalClips: number;
  activeToday: number;
  proSubscribers: number;
}

export function AdminDashboardClient() {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalClips: 0,
    activeToday: 0,
    proSubscribers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/v1/manage?action=stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data.data ?? data);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const STAT_CARDS = [
    {
      label: '총 사용자',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-blue-500',
    },
    {
      label: '총 클립',
      value: stats.totalClips,
      icon: FileText,
      color: 'text-green-500',
    },
    {
      label: '오늘 활성',
      value: stats.activeToday,
      icon: TrendingUp,
      color: 'text-orange-500',
    },
    {
      label: 'Pro 구독자',
      value: stats.proSubscribers,
      icon: Shield,
      color: 'text-purple-500',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">관리자 대시보드</h1>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center gap-3">
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                {loading ? (
                  <div className="h-7 w-16 animate-pulse rounded bg-muted" />
                ) : (
                  <p className="text-2xl font-bold">
                    {stat.value.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <h2 className="mb-4 text-lg font-semibold">빠른 관리</h2>
      <div className="flex flex-wrap gap-3">
        <Button variant="outline">공지사항 관리</Button>
        <Button variant="outline">사용자 관리</Button>
        <Button variant="outline">콘텐츠 관리</Button>
        <Button variant="outline">구독 관리</Button>
      </div>
    </div>
  );
}
