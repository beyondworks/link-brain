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
 * Assets from `/public/logo-*.svg` (copied from `logo/` directory).
 * - symbol: 39×22 (aspect ~1.77:1)
 * - typo:   79×17 (aspect ~4.65:1)
 * - full:  126×22 (aspect ~5.73:1)
 */
export function LinkbrainLogo({
  variant = 'full',
  height = 22,
  className,
}: LinkbrainLogoProps) {
  if (variant === 'symbol') {
    const w = Math.round(height * (39 / 22));
    return (
      <Image
        src="/logo-symbol.svg"
        alt="Linkbrain"
        width={w}
        height={height}
        className={cn('shrink-0', className)}
        priority
      />
    );
  }

  if (variant === 'typo') {
    const w = Math.round(height * (79 / 17));
    return (
      <Image
        src="/logo-typo.svg"
        alt="Linkbrain"
        width={w}
        height={height}
        className={cn('shrink-0', className)}
        priority
      />
    );
  }

  // full
  const w = Math.round(height * (126 / 22));
  return (
    <Image
      src="/logo-full.svg"
      alt="Linkbrain"
      width={w}
      height={height}
      className={cn('shrink-0', className)}
      priority
    />
  );
}
