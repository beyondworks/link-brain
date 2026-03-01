'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase/client';

const signupSchema = z.object({
  displayName: z.string().min(1, '이름을 입력해주세요'),
  email: z.string().email('올바른 이메일을 입력해주세요'),
  password: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다'),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      toast.error('Google 회원가입에 실패했습니다.');
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          display_name: data.displayName,
        },
      },
    });

    if (error) {
      toast.error(error.message ?? '회원가입에 실패했습니다.');
      setIsLoading(false);
      return;
    }

    toast.success('이메일을 확인해주세요. 인증 링크를 발송했습니다.');
    router.push('/login');
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-xl font-bold text-[var(--color-foreground)]">
          회원가입
        </h1>
        <p className="mt-1 text-sm text-[var(--color-foreground-muted)]">
          LinkBrain 계정을 만들어보세요
        </p>
      </div>

      {/* Google OAuth button */}
      <button
        type="button"
        onClick={handleGoogleSignup}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-surface-raised)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-brand)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
          />
          <path
            fill="#34A853"
            d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
          />
          <path
            fill="#FBBC05"
            d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
          />
          <path
            fill="#EA4335"
            d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
          />
        </svg>
        Google로 회원가입
      </button>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--color-border)]" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-[var(--color-surface)] px-2 text-[var(--color-foreground-muted)]">
            또는
          </span>
        </div>
      </div>

      {/* Email signup form */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="displayName">이름</Label>
          <Input
            id="displayName"
            type="text"
            placeholder="홍길동"
            autoComplete="name"
            disabled={isLoading}
            {...register('displayName')}
          />
          {errors.displayName && (
            <p className="text-xs text-red-500">{errors.displayName.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">이메일</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            disabled={isLoading}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">비밀번호</Label>
          <Input
            id="password"
            type="password"
            placeholder="최소 8자 이상"
            autoComplete="new-password"
            disabled={isLoading}
            {...register('password')}
          />
          {errors.password && (
            <p className="text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? '처리 중...' : '회원가입'}
        </Button>
      </form>

      <p className="text-center text-sm text-[var(--color-foreground-muted)]">
        이미 계정이 있으신가요?{' '}
        <Link
          href="/login"
          className="font-medium text-[var(--color-brand)] hover:text-[var(--color-brand-hover)] underline-offset-4 hover:underline"
        >
          로그인
        </Link>
      </p>

      <p className="text-center text-xs text-[var(--color-foreground-muted)]">
        회원가입하면{' '}
        <Link href="/terms" className="underline underline-offset-2 hover:text-[var(--color-foreground)]">
          이용약관
        </Link>{' '}
        및{' '}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-[var(--color-foreground)]">
          개인정보처리방침
        </Link>
        에 동의하게 됩니다.
      </p>
    </div>
  );
}
