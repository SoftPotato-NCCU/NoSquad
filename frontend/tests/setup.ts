import '@testing-library/jest-dom/vitest';
import { beforeAll, vi } from 'vitest';

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

beforeAll(() => {
  vi.stubEnv('NEXT_PUBLIC_API_BACKEND_URL', 'http://localhost:5050');
  global.localStorage = localStorageMock as Storage;
});