import { cn } from '@/lib/utils';
import Image from 'next/image';

interface LinkbrainLogoProps {
  /** "full" = symbol + typo, "symbol" = icon only, "typo" = text only */
  variant?: 'full' | 'symbol' | 'typo';
  /** Height in pixels — width scales proportionally */
  height?: number;
  className?: string;
}

/**
 * Linkbrain brand logo component.
 *
 * Assets from `/public/linkbrain-*.svg`.
 * - symbol: 37×20 (aspect 1.85:1)
 * - typo:   77×14 (aspect 5.5:1)
 * - full:  120×20 (aspect 6:1)
 */
export function LinkbrainLogo({
  variant = 'full',
  height = 20,
  className,
}: LinkbrainLogoProps) {
  if (variant === 'symbol') {
    const w = Math.round(height * (37 / 20));
    return (
      <Image
        src="/linkbrain-symbol.svg"
        alt="Linkbrain"
        width={w}
        height={height}
        className={cn('shrink-0', className)}
        priority
      />
    );
  }

  if (variant === 'typo') {
    const w = Math.round(height * (77 / 14));
    return (
      <Image
        src="/linkbrain-typo.svg"
        alt="Linkbrain"
        width={w}
        height={height}
        className={cn('shrink-0', className)}
        priority
      />
    );
  }

  // full
  const w = Math.round(height * (120 / 20));
  return (
    <Image
      src="/linkbrain-logo.svg"
      alt="Linkbrain"
      width={w}
      height={height}
      className={cn('shrink-0', className)}
      priority
    />
  );
}
