import {
  Home,
  Heart,
  Archive,
  Bookmark,
  Sparkles,
  BarChart3,
  Settings,
  Globe,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  labelKo: string;
  href: string;
  icon: LucideIcon;
  badge?: 'new' | 'pro';
}

export interface NavSection {
  title?: string;
  titleKo?: string;
  items: NavItem[];
}

export const MAIN_NAV: NavSection[] = [
  {
    items: [
      { label: 'Home', labelKo: '홈', href: '/dashboard', icon: Home },
      { label: 'Favorites', labelKo: '즐겨찾기', href: '/favorites', icon: Heart },
      { label: 'Read Later', labelKo: '나중에 읽기', href: '/dashboard?filter=readLater', icon: Bookmark },
      { label: 'Archive', labelKo: '아카이브', href: '/archive', icon: Archive },
    ],
  },
  {
    title: 'Tools',
    titleKo: '도구',
    items: [
      { label: 'Studio', labelKo: '스튜디오', href: '/studio', icon: Sparkles },
      { label: 'Insights', labelKo: '인사이트', href: '/insights', icon: BarChart3, badge: 'pro' },
      { label: 'Explore', labelKo: '탐색', href: '/explore', icon: Globe },
    ],
  },
];

export const BOTTOM_NAV: NavItem[] = [
  { label: 'Settings', labelKo: '설정', href: '/settings', icon: Settings },
];
