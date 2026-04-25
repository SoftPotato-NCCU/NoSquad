import { expect, describe, test } from 'bun:test';

describe('toISO', () => {
  test('returns null for null input', () => {
    const { toISO } = require('../../src/routes/v1/rooms');
    expect(toISO(null)).toBeNull();
  });

  test('converts Date object to ISO string', () => {
    const { toISO } = require('../../src/routes/v1/rooms');
    const date = new Date('2024-01-01T12:00:00Z');
    expect(toISO(date)).toBe('2024-01-01T12:00:00.000Z');
  });

  test('converts string to ISO string', () => {
    const { toISO } = require('../../src/routes/v1/rooms');
    expect(toISO('2024-01-01T12:00:00Z')).toBe('2024-01-01T12:00:00.000Z');
  });
});