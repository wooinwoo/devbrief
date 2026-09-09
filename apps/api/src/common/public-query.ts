import { BadRequestException } from '@nestjs/common';

export function queryText(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string')
    throw new BadRequestException('Query parameter must be a single string');
  return value;
}

export function queryLimit(value: unknown, fallback: number, maximum: number): number {
  const parsed = Number(queryText(value));
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}
