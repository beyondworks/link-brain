'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase/client';
import { ArrowLeft, Mail } from 'lucide-react';
import { LinkbrainLogo } from '@/components/brand/linkbrain-logo';

const schema = z.object({
  email: z.string().email('올바른 이메일 주소를 입력해 주세요.'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/callback?type=recovery`,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setIsSent(true);
      toast.success('비밀번호 재설정 링크를 이메일로 보냈습니다.');
    } catch {
      toast.error('요청 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-[380px] space-y-8">
        <div className="flex flex-col items-center gap-4">
          <LinkbrainLogo variant="symbol" height={36} />
          <h1 className="text-xl font-bold text-foreground">비밀번호 재설정</h1>
        </div>

        {isSent ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Mail size={24} className="text-primary" />
            </div>
            <p className="text-sm text-foreground">
              입력하신 이메일로 비밀번호 재설정 링크를 보냈습니다.
            </p>
            <p className="text-xs text-muted-foreground">
              이메일이 도착하지 않으면 스팸 폴더를 확인해 주세요.
            </p>
            <Link
              href="/login"
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ArrowLeft size={14} />
              로그인으로 돌아가기
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <p className="text-center text-sm text-muted-foreground">
              가입할 때 사용한 이메일 주소를 입력하면 비밀번호 재설정 링크를 보내드립니다.
            </p>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-sm font-semibold text-foreground">
                이메일
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="이메일 주소를 입력하세요"
                autoComplete="email"
                disabled={isLoading}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 font-semibold text-sm rounded-xl"
              style={{
                background: 'linear-gradient(90deg, #21DBA4, #5DD5C3)',
                color: '#ffffff',
                border: 'none',
              }}
            >
              {isLoading ? '처리 중...' : '재설정 링크 보내기'}
            </Button>

            <div className="text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft size={14} />
                로그인으로 돌아가기
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
