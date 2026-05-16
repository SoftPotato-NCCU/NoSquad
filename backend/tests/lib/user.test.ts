import { expect, describe, test } from 'bun:test';

import { publicUser } from '../../src/routes/v1/auth';

describe('publicUser', () => {

  test('returns user object with correct shape', () => {
    const userRow = {
      uuid: 'user-123',
      name: 'John Doe',
      username: 'johndoe',
      email: 'john@example.com',
      phone: '+1234567890',
      hashed_password: 'hash_ignored',
      last_activity: null,
      created_at: new Date(),
      rating_avg: 0,
      rating_count: 0,
    };

    const result = publicUser(userRow);

    expect(result).toEqual({
      id: 'user-123',
      name: 'John Doe',
      username: 'johndoe',
      email: 'john@example.com',
      phone: '+1234567890',
    });
  });

  test('handles all fields present', () => {
    const userRow = {
      uuid: 'user-456',
      name: 'Jane Doe',
      username: 'janed',
      email: 'jane@example.com',
      phone: '+0987654321',
      hashed_password: 'somehash',
      last_activity: new Date(),
      created_at: new Date(),
      rating_avg: 4.5,
      rating_count: 10,
    };

    const result = publicUser(userRow);

    expect(result.id).toBe('user-456');
    expect(result.name).toBe('Jane Doe');
    expect(result.username).toBe('janed');
    expect(result.email).toBe('jane@example.com');
    expect(result.phone).toBe('+0987654321');
  });
});