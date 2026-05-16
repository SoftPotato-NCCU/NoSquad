import { expect, describe, test } from 'bun:test';

import { toISO } from '../../src/routes/v1/rooms';

describe('toISO', () => {
  test('returns null for null input', () => {
    expect(toISO(null)).toBeNull();
  });

  test('converts Date object to ISO string', () => {
    const date = new Date('2024-01-01T12:00:00Z');
    expect(toISO(date)).toBe('2024-01-01T12:00:00.000Z');
  });

  test('converts string to ISO string', () => {
    expect(toISO('2024-01-01T12:00:00Z')).toBe('2024-01-01T12:00:00.000Z');
  });
});