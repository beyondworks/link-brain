import type { Metadata } from 'next';
import { DashboardClient } from './dashboard-client';

export const metadata: Metadata = {
  title: '대시보드',
  description: '저장한 클립 통계와 최근 활동을 한눈에 확인하세요.',
};

export default function DashboardPage() {
  return <DashboardClient />;
}
