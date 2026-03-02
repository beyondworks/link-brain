'use client';

import Link from 'next/link';
import { Home, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  // Prepend home item
  const allItems: BreadcrumbItem[] = [{ label: '대시보드', href: '/dashboard' }, ...items];

  // Mobile: only last 2 items, collapse middle with "..."
  const mobileItems: BreadcrumbItem[] =
    allItems.length > 2
      ? [allItems[0], { label: '...', href: undefined }, allItems[allItems.length - 1]]
      : allItems;

  // JSON-LD structured data (safe: no user input, only our own labels/hrefs)
  const jsonLdString = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: allItems.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: item.href } : {}),
    })),
  });

  return (
    <>
      {/* eslint-disable-next-line react/no-danger -- safe: content is JSON.stringify of our own data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString }} />
      <nav aria-label="탐색 경로">
        {/* Desktop: all items */}
        <ol className="hidden sm:flex items-center gap-1 text-sm">
          {allItems.map((item, index) => (
            <BreadcrumbEntry
              key={index}
              item={item}
              isFirst={index === 0}
              isLast={index === allItems.length - 1}
            />
          ))}
        </ol>
        {/* Mobile: collapsed */}
        <ol className="flex sm:hidden items-center gap-1 text-sm">
          {mobileItems.map((item, index) => (
            <BreadcrumbEntry
              key={index}
              item={item}
              isFirst={index === 0}
              isLast={index === mobileItems.length - 1}
            />
          ))}
        </ol>
      </nav>
    </>
  );
}

interface BreadcrumbEntryProps {
  item: BreadcrumbItem;
  isFirst: boolean;
  isLast: boolean;
}

function BreadcrumbEntry({ item, isFirst, isLast }: BreadcrumbEntryProps) {
  const isEllipsis = item.label === '...';

  return (
    <li className="flex items-center gap-1">
      {!isFirst && (
        <ChevronRight size={13} className="shrink-0 text-muted-foreground/50" aria-hidden="true" />
      )}
      {isEllipsis ? (
        <span className="text-muted-foreground/60 text-xs px-0.5" aria-hidden="true">
          ...
        </span>
      ) : isLast || !item.href ? (
        <span
          className={cn(
            'max-w-[200px] truncate',
            isLast ? 'font-medium text-foreground' : 'text-muted-foreground',
          )}
          aria-current={isLast ? 'page' : undefined}
        >
          {isFirst ? (
            <span className="flex items-center gap-1">
              <Home size={13} aria-hidden="true" />
              <span className="sr-only">{item.label}</span>
            </span>
          ) : (
            item.label
          )}
        </span>
      ) : (
        <Link
          href={item.href}
          className={cn(
            'max-w-[200px] truncate transition-colors hover:text-foreground',
            'text-muted-foreground',
            isFirst && 'flex items-center gap-1',
          )}
        >
          {isFirst ? (
            <>
              <Home size={13} aria-hidden="true" />
              <span className="sr-only">{item.label}</span>
            </>
          ) : (
            item.label
          )}
        </Link>
      )}
    </li>
  );
}
