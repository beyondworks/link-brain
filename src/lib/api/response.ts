/**
 * API v1 Response Helpers
 *
 * Consistent response format for all v1 API endpoints.
 * All responses follow the envelope pattern with success flag.
 * Returns NextResponse objects for Next.js App Router.
 */

import { NextResponse } from 'next/server';

// Standard pagination metadata
export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// Success response structure
export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

// Error response structure
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    retryAfter?: number;
  };
}

// Error codes enum for consistency
export const ErrorCodes = {
  // Authentication
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  INVALID_API_KEY: 'INVALID_API_KEY',
  KEY_REVOKED: 'KEY_REVOKED',
  KEY_EXPIRED: 'KEY_EXPIRED',
  KEY_LIMIT_REACHED: 'KEY_LIMIT_REACHED',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Resources
  CLIP_NOT_FOUND: 'CLIP_NOT_FOUND',
  CATEGORY_NOT_FOUND: 'CATEGORY_NOT_FOUND',
  COLLECTION_NOT_FOUND: 'COLLECTION_NOT_FOUND',
  WEBHOOK_NOT_FOUND: 'WEBHOOK_NOT_FOUND',

  // Validation
  INVALID_REQUEST: 'INVALID_REQUEST',
  INVALID_URL: 'INVALID_URL',
  DUPLICATE_URL: 'DUPLICATE_URL',
  DUPLICATE_CATEGORY: 'DUPLICATE_CATEGORY',

  // Permissions
  ACCESS_DENIED: 'ACCESS_DENIED',
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
  AI_DAILY_LIMIT: 'AI_DAILY_LIMIT',

  // Plan limits
  CLIP_LIMIT_REACHED: 'CLIP_LIMIT_REACHED',
  COLLECTION_LIMIT_REACHED: 'COLLECTION_LIMIT_REACHED',
  API_KEY_LIMIT_REACHED: 'API_KEY_LIMIT_REACHED',
  STUDIO_LIMIT_REACHED: 'STUDIO_LIMIT_REACHED',
  FEATURE_NOT_AVAILABLE: 'FEATURE_NOT_AVAILABLE',
  UPGRADE_REQUIRED: 'UPGRADE_REQUIRED',

  // Webhooks
  HTTPS_REQUIRED: 'HTTPS_REQUIRED',
  WEBHOOK_UNREACHABLE: 'WEBHOOK_UNREACHABLE',
  WEBHOOK_LIMIT_REACHED: 'WEBHOOK_LIMIT_REACHED',

  // General
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Return a success response
 */
export function sendSuccess<T>(
  data: T,
  statusCode: number = 200,
  meta?: PaginationMeta
): NextResponse {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    ...(meta && { meta }),
  };
  return NextResponse.json(response, { status: statusCode });
}

/**
 * Return a paginated success response
 */
export function sendPaginated<T>(
  data: T[],
  total: number,
  limit: number,
  offset: number
): NextResponse {
  return sendSuccess(data, 200, {
    total,
    limit,
    offset,
    hasMore: offset + data.length < total,
  });
}

/**
 * Return an error response
 */
export function sendError(
  code: ErrorCode | string,
  message: string,
  statusCode: number = 400,
  details?: Record<string, unknown>,
  retryAfter?: number
): NextResponse {
  const response: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
      ...(retryAfter !== undefined && { retryAfter }),
    },
  };
  return NextResponse.json(response, { status: statusCode });
}

// Convenience error factories
export const errors = {
  authRequired: () =>
    sendError(
      ErrorCodes.AUTH_REQUIRED,
      'Authentication required. Provide X-API-Key or Bearer token.',
      401
    ),

  invalidApiKey: () =>
    sendError(ErrorCodes.INVALID_API_KEY, 'Invalid or unknown API key.', 401),

  keyRevoked: () =>
    sendError(ErrorCodes.KEY_REVOKED, 'This API key has been revoked.', 401),

  accessDenied: () =>
    sendError(
      ErrorCodes.ACCESS_DENIED,
      'You do not have permission to access this resource.',
      403
    ),

  rateLimitExceeded: (retryAfter: number) =>
    sendError(
      ErrorCodes.RATE_LIMIT_EXCEEDED,
      `Rate limit exceeded. Retry after ${retryAfter} seconds.`,
      429,
      undefined,
      retryAfter
    ),

  notFound: (resource: string) =>
    sendError(
      `${resource.toUpperCase()}_NOT_FOUND` as ErrorCode,
      `${resource} not found.`,
      404
    ),

  invalidRequest: (message: string, details?: Record<string, unknown>) =>
    sendError(ErrorCodes.INVALID_REQUEST, message, 400, details),

  insufficientCredits: (required: number, available: number) =>
    sendError(
      ErrorCodes.INSUFFICIENT_CREDITS,
      `크레딧이 부족합니다. 필요: ${required}, 잔여: ${available}. 플랜을 업그레이드하면 더 많은 크레딧을 사용할 수 있습니다.`,
      402,
      { required, available, upgradeUrl: '/pricing' }
    ),

  planLimitReached: (resource: string, used: number, limit: number) =>
    sendError(
      `${resource.toUpperCase()}_LIMIT_REACHED` as ErrorCode,
      `${resource} 한도에 도달했습니다. 사용: ${used}/${limit}. 플랜을 업그레이드하세요.`,
      403,
      { used, limit, upgradeUrl: '/pricing' }
    ),

  featureNotAvailable: (feature: string) =>
    sendError(
      ErrorCodes.FEATURE_NOT_AVAILABLE,
      `This feature requires a higher plan. Upgrade to access: ${feature}`,
      403,
      { feature, upgradeUrl: '/pricing' }
    ),

  methodNotAllowed: (allowed: string[]) =>
    sendError(
      ErrorCodes.METHOD_NOT_ALLOWED,
      `Method not allowed. Allowed: ${allowed.join(', ')}`,
      405,
      { allowed }
    ),

  internalError: (message: string = 'An unexpected error occurred.') =>
    sendError(ErrorCodes.INTERNAL_ERROR, message, 500),
};
