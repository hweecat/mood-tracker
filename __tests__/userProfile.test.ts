import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { PUT as userPUT } from '@/app/api/user/route';
import { getServerSession } from "next-auth";
import db from '@/lib/db';

// Mock dependencies
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock('@/lib/db', () => ({
  default: {
    prepare: vi.fn(),
  },
}));

describe('User Profile API', () => {
  const mockPrepare = db.prepare as Mock;
  const mockGetServerSession = getServerSession as Mock;
  
  const mockRun = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    mockPrepare.mockReturnValue({
      run: mockRun,
    });
  });

  it('PUT returns 401 if unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = new Request('http://localhost/api/user', { 
      method: 'PUT', 
      body: JSON.stringify({ name: 'New Name', email: 'new@example.com' }) 
    });
    const response = await userPUT(req);
    expect(response.status).toBe(401);
  });

  it('PUT updates user name and email if authenticated', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-123' } });
    mockRun.mockReturnValue({ changes: 1 });

    const req = new Request('http://localhost/api/user', { 
      method: 'PUT', 
      body: JSON.stringify({ name: 'John Doe', email: 'john@example.com' }) 
    });
    
    const response = await userPUT(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE users SET name = ?, email = ? WHERE id = ?'));
    expect(mockRun).toHaveBeenCalledWith('John Doe', 'john@example.com', 'user-123');
  });

  it('PUT returns 400 for invalid email', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-123' } });
    
    const req = new Request('http://localhost/api/user', { 
      method: 'PUT', 
      body: JSON.stringify({ name: 'John Doe', email: 'invalid-email' }) 
    });
    
    const response = await userPUT(req);
    expect(response.status).toBe(400);
  });
});
