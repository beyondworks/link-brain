import { ImageResponse } from 'next/og';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const alt = 'Linkbrain Clip';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export default async function OGImage({ params }: { params: Promise<{ clipId: string }> }) {
  const { clipId } = await params;

  let title = 'Linkbrain';
  let summary = 'AI-powered Bookmark Manager';
  let platform = '';

  try {
    const { data } = await db
      .from('clips')
      .select('title, summary, platform')
      .eq('id', clipId)
      .eq('is_public', true)
      .single();

    if (data) {
      title = data.title ?? 'Linkbrain';
      summary = data.summary?.slice(0, 120) ?? '';
      platform = data.platform ?? '';
    }
  } catch {
    // Use defaults
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {platform && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#21DBA4',
                fontSize: '18px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {platform}
            </div>
          )}
          <div
            style={{
              fontSize: '48px',
              fontWeight: 700,
              color: '#f8fafc',
              lineHeight: 1.2,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {title}
          </div>
          {summary && (
            <div
              style={{
                fontSize: '22px',
                color: '#94a3b8',
                lineHeight: 1.5,
                marginTop: '8px',
              }}
            >
              {summary}
            </div>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#21DBA4',
              fontSize: '24px',
              fontWeight: 700,
            }}
          >
            Linkbrain
          </div>
          <div style={{ color: '#64748b', fontSize: '16px' }}>
            linkbrain.cloud
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
