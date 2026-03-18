import type { Metadata } from 'next';
import { SettingsClient } from './settings-client';

export const metadata: Metadata = {
  title: '설정',
  description: '계정, 알림, AI 모델 등 설정을 관리하세요.',
};

export default function SettingsPage() {
  return <SettingsClient />;
}
