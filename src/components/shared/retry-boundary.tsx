'use client';

import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface RetryBoundaryProps {
  children: ReactNode;
  fallbackMessage?: string;
}

interface RetryBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class RetryBoundary extends Component<
  RetryBoundaryProps,
  RetryBoundaryState
> {
  constructor(props: RetryBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): RetryBoundaryState {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
          <div>
            <p className="font-medium">
              {this.props.fallbackMessage ?? '문제가 발생했습니다'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {this.state.error?.message ?? '알 수 없는 오류'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={this.handleRetry}>
            다시 시도
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
