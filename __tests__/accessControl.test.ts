import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { GET as moodGET, POST as moodPOST, DELETE as moodDELETE } from '@/app/api/mood/route';
import { GET as cbtGET, POST as cbtPOST, PUT as cbtPUT, DELETE as cbtDELETE } from '@/app/api/cbt/route';
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

describe('RBAC Access Control', () => {
  const originalEnv = process.env;
  const mockPrepare = db.prepare as Mock;
  const mockGetServerSession = getServerSession as Mock;
  
  const mockRun = vi.fn().mockReturnValue({ changes: 1 });
  const mockAll = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
    
    mockRun.mockReturnValue({ changes: 1 });
    mockPrepare.mockReturnValue({
      run: mockRun,
      all: mockAll,
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Mood API - When ENABLE_RBAC is true', () => {
    beforeEach(() => {
      process.env.ENABLE_RBAC = 'true';
    });

    it('GET returns 401 if unauthenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);
      const response = await moodGET();
      expect(response.status).toBe(401);
    });

    it('GET filters by user_id if authenticated', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'user-123' } });
      mockAll.mockReturnValue([]);
      await moodGET();
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('WHERE user_id = ?'));
      expect(mockAll).toHaveBeenCalledWith('user-123');
    });

    it('POST saves with user_id if authenticated', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'user-123' } });
      const entry = { id: '1', rating: 5, emotions: [], timestamp: 123 };
      const req = new Request('http://localhost/api/mood', { method: 'POST', body: JSON.stringify(entry) });
      await moodPOST(req);
      expect(mockRun).toHaveBeenCalledWith(
        '1', 5, '[]', null, null, null, 123, 'user-123'
      );
    });

    it('DELETE filters by user_id if authenticated', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'user-123' } });
      const req = new Request('http://localhost/api/mood?id=1', { method: 'DELETE' });
      await moodDELETE(req);
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('WHERE id = ? AND user_id = ?'));
      expect(mockRun).toHaveBeenCalledWith('1', 'user-123');
    });
  });

  describe('CBT API - When ENABLE_RBAC is true', () => {
    beforeEach(() => {
      process.env.ENABLE_RBAC = 'true';
    });

    it('GET returns 401 if unauthenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);
      const response = await cbtGET();
      expect(response.status).toBe(401);
    });

    it('GET filters by user_id if authenticated', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'user-456' } });
      mockAll.mockReturnValue([]);
      await cbtGET();
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('WHERE user_id = ?'));
      expect(mockAll).toHaveBeenCalledWith('user-456');
    });

    it('POST saves with user_id if authenticated', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'user-456' } });
      const log = { 
        id: '1', situation: 's', automaticThoughts: 'a', distortions: [], 
        rationalResponse: 'r', moodBefore: 5, timestamp: 123 
      };
      const req = new Request('http://localhost/api/cbt', { method: 'POST', body: JSON.stringify(log) });
      await cbtPOST(req);
      expect(mockRun).toHaveBeenCalledWith(
        '1', 123, 's', 'a', '[]', 'r', 5, null, null, 'user-456'
      );
    });

    it('PUT updates only if owned by user', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'user-456' } });
      const log = { 
        id: '1', situation: 's', automaticThoughts: 'a', distortions: [], 
        rationalResponse: 'r', moodBefore: 5, timestamp: 123 
      };
      const req = new Request('http://localhost/api/cbt', { method: 'PUT', body: JSON.stringify(log) });
      await cbtPUT(req);
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('WHERE id = ? AND user_id = ?'));
      expect(mockRun).toHaveBeenCalledWith(
        's', 'a', '[]', 'r', 5, null, null, 123, '1', 'user-456'
      );
    });

    it('DELETE removes only if owned by user', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'user-456' } });
      const req = new Request('http://localhost/api/cbt?id=log-1', { method: 'DELETE' });
      await cbtDELETE(req);
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('WHERE id = ? AND user_id = ?'));
      expect(mockRun).toHaveBeenCalledWith('log-1', 'user-456');
    });
  });

  describe('When ENABLE_RBAC is false', () => {
    beforeEach(() => {
      process.env.ENABLE_RBAC = 'false';
    });

    it('GET mood returns all entries', async () => {
      mockAll.mockReturnValue([]);
      await moodGET();
      expect(mockPrepare).toHaveBeenCalledWith(expect.not.stringContaining('WHERE user_id = ?'));
    });

    it('POST mood uses default user_id "1"', async () => {
      const entry = { id: '1', rating: 5, emotions: [], timestamp: 123 };
      const req = new Request('http://localhost/api/mood', { method: 'POST', body: JSON.stringify(entry) });
      await moodPOST(req);
      expect(mockRun).toHaveBeenCalledWith(
        '1', 5, '[]', null, null, null, 123, '1'
      );
    });
  });
});