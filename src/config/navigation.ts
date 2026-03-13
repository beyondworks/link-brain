import {
  Home,
  Heart,
  Archive,
  Bookmark,
  Sparkles,
  BarChart3,
  Globe,
  FolderOpen,
  ImageIcon,
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
      { label: 'Read Later', labelKo: '나중에 읽기', href: '/read-later', icon: Bookmark },
      { label: 'Archive', labelKo: '아카이브', href: '/archive', icon: Archive },
    ],
  },
  {
    title: 'Library',
    titleKo: '라이브러리',
    items: [
      { label: 'Collections', labelKo: '컬렉션', href: '/collections', icon: FolderOpen },
      { label: 'Images', labelKo: '이미지', href: '/images', icon: ImageIcon },
    ],
  },
  {
    title: 'Tools',
    titleKo: '도구',
    items: [
      { label: 'Studio', labelKo: '스튜디오', href: '/studio', icon: Sparkles },
      { label: 'Insights', labelKo: '인사이트', href: '/insights', icon: BarChart3 },
      { label: 'Explore', labelKo: '탐색', href: '/explore', icon: Globe },
    ],
  },
];

export const BOTTOM_NAV: NavItem[] = [];
