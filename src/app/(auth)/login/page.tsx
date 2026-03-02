'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase/client';

const loginSchema = z.object({
  email: z.string().email('올바른 이메일을 입력해주세요'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const next = searchParams.get('next') ?? '/dashboard';
  const errorParam = searchParams.get('error');

  useEffect(() => {
    if (errorParam === 'auth_error') {
      toast.error('인증에 실패했습니다. 다시 시도해주세요.');
    }
  }, [errorParam]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) {
      toast.error('Google 로그인에 실패했습니다.');
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      toast.error(error.message ?? '로그인에 실패했습니다.');
      setIsLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="text-center animate-fade-in-up">
        <h1 className="text-2xl font-black text-foreground tracking-tight">
          다시 만나요
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          LinkBrain에 오신 것을 환영합니다
        </p>
      </div>

      {/* Google OAuth button */}
      <div className="animate-fade-in-up animation-delay-100">
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 rounded-xl border border-border bg-background px-4 py-3.5 text-sm font-semibold text-foreground transition-all duration-300 hover:bg-muted hover-lift focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
        >
          <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true">
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
          Google로 계속하기
        </button>
      </div>

      {/* Divider */}
      <div className="relative animate-fade-in-up animation-delay-200">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full divider-gradient" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-card px-3 text-muted-foreground font-medium">
            또는 이메일로 로그인
          </span>
        </div>
      </div>

      {/* Email login form */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5 animate-fade-in-up animation-delay-300">
          <Label htmlFor="email" className="text-sm font-semibold text-foreground">
            이메일
          </Label>
          <div className="relative">
            {(() => {
              const emailReg = register('email');
              return (
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={isLoading}
                  {...emailReg}
                  onFocus={() => setFocusedField('email')}
                  onBlur={(e) => { setFocusedField(null); emailReg.onBlur(e); }}
                  className={`transition-all duration-300 ${
                    focusedField === 'email'
                      ? 'ring-2 ring-primary/40 glow-brand-sm border-primary/60'
                      : ''
                  }`}
                />
              );
            })()}
          </div>
          {errors.email && (
            <p className="text-xs text-destructive animate-fade-in-up">{errors.email.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5 animate-fade-in-up animation-delay-400">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-semibold text-foreground">
              비밀번호
            </Label>
          </div>
          <div className="relative">
            {(() => {
              const passwordReg = register('password');
              return (
                <Input
                  id="password"
                  type="password"
                  placeholder="비밀번호를 입력하세요"
                  autoComplete="current-password"
                  disabled={isLoading}
                  {...passwordReg}
                  onFocus={() => setFocusedField('password')}
                  onBlur={(e) => { setFocusedField(null); passwordReg.onBlur(e); }}
                  className={`transition-all duration-300 ${
                    focusedField === 'password'
                      ? 'ring-2 ring-primary/40 glow-brand-sm border-primary/60'
                      : ''
                  }`}
                />
              );
            })()}
          </div>
          {errors.password && (
            <p className="text-xs text-destructive animate-fade-in-up">{errors.password.message}</p>
          )}
        </div>

        <div className="animate-fade-in-up animation-delay-500">
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 font-semibold text-sm rounded-xl transition-all duration-300 hover:glow-brand hover-lift"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                처리 중...
              </span>
            ) : '로그인'}
          </Button>
        </div>
      </form>

      {/* Links */}
      <div className="flex flex-col gap-3 animate-fade-in-up animation-delay-600">
        <p className="text-center text-sm text-muted-foreground">
          계정이 없으신가요?{' '}
          <Link
            href="/signup"
            className="font-semibold text-gradient-brand hover:opacity-80 transition-opacity underline-offset-4 hover:underline"
          >
            회원가입
          </Link>
        </p>

        <p className="text-center text-xs text-muted-foreground leading-relaxed">
          로그인하면{' '}
          <Link href="/terms" className="underline underline-offset-2 hover:text-foreground transition-colors">
            이용약관
          </Link>{' '}
          및{' '}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground transition-colors">
            개인정보처리방침
          </Link>
          에 동의하게 됩니다.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex flex-col gap-6" />}>
      <LoginForm />
    </Suspense>
  );
}
