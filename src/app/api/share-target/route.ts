/**
 * PWA Share Target API
 * 모바일에서 "공유" 메뉴를 통해 URL을 Linkbrain에 저장
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  // Verify authentication — prevent open redirect abuse
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const formData = await req.formData();
  const url = formData.get('url') as string | null;
  const text = formData.get('text') as string | null;
  const title = formData.get('title') as string | null;

  // URL 추출: url 파라미터 우선, 없으면 text에서 URL 패턴 추출
  let targetUrl = url;
  if (!targetUrl && text) {
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    if (urlMatch) targetUrl = urlMatch[0];
  }

  if (!targetUrl) {
    // URL이 없으면 대시보드로 리다이렉트
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // 클립 추가 다이얼로그로 리다이렉트 (URL 파라미터 전달)
  const redirectUrl = new URL('/dashboard', req.url);
  redirectUrl.searchParams.set('addUrl', targetUrl);
  if (title) redirectUrl.searchParams.set('addTitle', title);

  return NextResponse.redirect(redirectUrl);
}
