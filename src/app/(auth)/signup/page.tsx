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
import { getErrorMessage } from '@/lib/utils/get-error-message';

const signupSchema = z.object({
  displayName: z.string().min(1, '이름을 입력해주세요'),
  email: z.string().email('올바른 이메일을 입력해주세요'),
  password: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다'),
});

type SignupFormValues = z.infer<typeof signupSchema>;

function getPasswordStrength(password: string): { level: number; label: string; colorClass: string; gradient: string } {
  if (!password) return { level: 0, label: '', colorClass: '', gradient: '' };
  if (password.length < 8) return {
    level: 1,
    label: '약함',
    colorClass: 'text-red-500',
    gradient: 'linear-gradient(90deg, oklch(0.577 0.245 27.325), oklch(0.577 0.245 27.325))',
  };
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const score = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  if (score <= 2) return {
    level: 2,
    label: '보통',
    colorClass: 'text-yellow-500',
    gradient: 'linear-gradient(90deg, oklch(0.75 0.16 65), oklch(0.80 0.14 65))',
  };
  if (score === 3) return {
    level: 3,
    label: '강함',
    colorClass: 'text-primary',
    gradient: 'linear-gradient(90deg, oklch(0.78 0.15 168), oklch(0.65 0.18 155))',
  };
  return {
    level: 4,
    label: '매우 강함',
    colorClass: 'text-primary',
    gradient: 'linear-gradient(90deg, oklch(0.78 0.15 168), oklch(0.65 0.18 155), oklch(0.55 0.14 200))',
  };
}

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });

  const passwordValue = watch('password', '');
  const strength = getPasswordStrength(passwordValue);

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/callback`,
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
      toast.error(getErrorMessage(error, '회원가입에 실패했습니다.'));
      setIsLoading(false);
      return;
    }

    toast.success('이메일을 확인해주세요. 인증 링크를 발송했습니다.');
    router.push('/login');
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="text-center animate-fade-in-up">
        <h1 className="text-2xl font-black text-foreground tracking-tight">
          시작해볼까요
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          LinkBrain 계정을 만들어보세요
        </p>
      </div>

      {/* Google OAuth button */}
      <div className="animate-fade-in-up animation-delay-100">
        <button
          type="button"
          onClick={handleGoogleSignup}
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
          Google로 회원가입
        </button>
      </div>

      {/* Divider */}
      <div className="relative animate-fade-in-up animation-delay-200">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full divider-gradient" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-card px-3 text-muted-foreground font-medium">
            또는 이메일로 가입
          </span>
        </div>
      </div>

      {/* Email signup form */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Display name */}
        <div className="flex flex-col gap-1.5 animate-fade-in-up animation-delay-300">
          <Label htmlFor="displayName" className="text-sm font-semibold text-foreground">
            이름
          </Label>
          {(() => {
            const reg = register('displayName');
            return (
              <Input
                id="displayName"
                type="text"
                placeholder="홍길동"
                autoComplete="name"
                disabled={isLoading}
                {...reg}
                onFocus={() => setFocusedField('displayName')}
                onBlur={(e) => { setFocusedField(null); reg.onBlur(e); }}
                className={`transition-all duration-300 ${
                  focusedField === 'displayName'
                    ? 'ring-2 ring-primary/40 glow-brand-sm border-primary/60'
                    : ''
                }`}
              />
            );
          })()}
          {errors.displayName && (
            <p className="text-xs text-destructive animate-fade-in-up">{errors.displayName.message}</p>
          )}
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1.5 animate-fade-in-up animation-delay-400">
          <Label htmlFor="email" className="text-sm font-semibold text-foreground">
            이메일
          </Label>
          {(() => {
            const reg = register('email');
            return (
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                disabled={isLoading}
                {...reg}
                onFocus={() => setFocusedField('email')}
                onBlur={(e) => { setFocusedField(null); reg.onBlur(e); }}
                className={`transition-all duration-300 ${
                  focusedField === 'email'
                    ? 'ring-2 ring-primary/40 glow-brand-sm border-primary/60'
                    : ''
                }`}
              />
            );
          })()}
          {errors.email && (
            <p className="text-xs text-destructive animate-fade-in-up">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5 animate-fade-in-up animation-delay-500">
          <Label htmlFor="password" className="text-sm font-semibold text-foreground">
            비밀번호
          </Label>
          {(() => {
            const reg = register('password');
            return (
              <Input
                id="password"
                type="password"
                placeholder="최소 8자 이상"
                autoComplete="new-password"
                disabled={isLoading}
                {...reg}
                onFocus={() => setFocusedField('password')}
                onBlur={(e) => { setFocusedField(null); reg.onBlur(e); }}
                className={`transition-all duration-300 ${
                  focusedField === 'password'
                    ? 'ring-2 ring-primary/40 glow-brand-sm border-primary/60'
                    : ''
                }`}
              />
            );
          })()}

          {/* Password strength indicator */}
          {passwordValue.length > 0 && (
            <div className="flex flex-col gap-1.5 animate-fade-in-up">
              {/* Bar track */}
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${(strength.level / 4) * 100}%`,
                    background: strength.gradient,
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-0.5 w-4 rounded-full transition-all duration-300 ${
                        strength.level >= i ? 'opacity-100' : 'opacity-20 bg-muted-foreground'
                      }`}
                      style={
                        strength.level >= i
                          ? { background: strength.gradient }
                          : {}
                      }
                    />
                  ))}
                </div>
                <span className={`text-xs font-semibold ${strength.colorClass} transition-colors duration-300`}>
                  {strength.label}
                </span>
              </div>
            </div>
          )}

          {errors.password && (
            <p className="text-xs text-destructive animate-fade-in-up">{errors.password.message}</p>
          )}
        </div>

        <div className="animate-fade-in-up animation-delay-600">
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
            ) : '회원가입'}
          </Button>
        </div>
      </form>

      {/* Links */}
      <div className="flex flex-col gap-3 animate-fade-in-up animation-delay-700">
        <p className="text-center text-sm text-muted-foreground">
          이미 계정이 있으신가요?{' '}
          <Link
            href="/login"
            className="font-semibold text-gradient-brand hover:opacity-80 transition-opacity underline-offset-4 hover:underline"
          >
            로그인
          </Link>
        </p>

        <p className="text-center text-xs text-muted-foreground leading-relaxed">
          회원가입하면{' '}
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
