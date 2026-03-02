'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqAccordionProps {
  items: FaqItem[];
}

export function FaqAccordion({ items }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function toggle(index: number) {
    setOpenIndex((prev) => (prev === index ? null : index));
  }

  return (
    <div className="mx-auto max-w-3xl divide-y divide-border/60">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={i} className="group">
            <button
              type="button"
              onClick={() => toggle(i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 py-5 text-left text-base font-semibold tracking-tight transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
            >
              <span>{item.question}</span>
              <ChevronDown
                className={cn(
                  'h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200',
                  isOpen && 'rotate-180 text-primary',
                )}
              />
            </button>
            <div
              className={cn(
                'overflow-hidden transition-all duration-300',
                isOpen ? 'max-h-96 pb-5' : 'max-h-0',
              )}
              aria-hidden={!isOpen}
            >
              <p className="text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
