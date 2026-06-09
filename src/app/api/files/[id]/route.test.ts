import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks -----------------------------------------------------------------
const auth = vi.fn();
const updateMany = vi.fn();
const deleteMany = vi.fn();
const findFirst = vi.fn();

vi.mock('@/auth', () => ({ auth: () => auth() }));
vi.mock('@/lib/prisma', () => ({
  prisma: { markdownFile: { updateMany, deleteMany, findFirst } },
}));

// Import after mocks are registered.
const { GET, PATCH, DELETE } = await import('./route');

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const patchReq = (body: unknown) =>
  new NextRequest('http://localhost/api/files/file-a', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
const plainReq = () => new NextRequest('http://localhost/api/files/file-a');

const SESSION_A = { user: { id: 'user-a' } };
const SESSION_B = { user: { id: 'user-b' } };
const VALID = { title: 'Title', content: 'body' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PATCH /api/files/[id]', () => {
  it('returns 401 without a session and never touches the database', async () => {
    auth.mockResolvedValue(null);
    const res = await PATCH(patchReq(VALID), params('file-a'));
    expect(res.status).toBe(401);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('returns 400 on invalid input without writing', async () => {
    auth.mockResolvedValue(SESSION_A);
    const res = await PATCH(patchReq({ title: '', content: '' }), params('file-a'));
    expect(res.status).toBe(400);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('scopes the update to the owner and 404s when nothing matches', async () => {
    // user-b tries to edit a file owned by user-a → no row matches.
    auth.mockResolvedValue(SESSION_B);
    updateMany.mockResolvedValue({ count: 0 });

    const res = await PATCH(patchReq(VALID), params('file-a'));

    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'file-a', userId: 'user-b' } })
    );
    expect(res.status).toBe(404);
  });

  it('updates and returns the file for the owner', async () => {
    auth.mockResolvedValue(SESSION_A);
    updateMany.mockResolvedValue({ count: 1 });
    findFirst.mockResolvedValue({ id: 'file-a', ...VALID, userId: 'user-a' });

    const res = await PATCH(patchReq(VALID), params('file-a'));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: 'file-a', userId: 'user-a' });
  });
});

describe('DELETE /api/files/[id]', () => {
  it('returns 401 without a session', async () => {
    auth.mockResolvedValue(null);
    const res = await DELETE(plainReq(), params('file-a'));
    expect(res.status).toBe(401);
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('scopes the delete to the owner and 404s when nothing matches', async () => {
    auth.mockResolvedValue(SESSION_B);
    deleteMany.mockResolvedValue({ count: 0 });

    const res = await DELETE(plainReq(), params('file-a'));

    expect(deleteMany).toHaveBeenCalledWith({ where: { id: 'file-a', userId: 'user-b' } });
    expect(res.status).toBe(404);
  });

  it('deletes the file for the owner', async () => {
    auth.mockResolvedValue(SESSION_A);
    deleteMany.mockResolvedValue({ count: 1 });
    const res = await DELETE(plainReq(), params('file-a'));
    expect(res.status).toBe(200);
  });
});

describe('GET /api/files/[id]', () => {
  it('scopes the read to the owner and 404s when nothing matches', async () => {
    auth.mockResolvedValue(SESSION_B);
    findFirst.mockResolvedValue(null);

    const res = await GET(plainReq(), params('file-a'));

    expect(findFirst).toHaveBeenCalledWith({ where: { id: 'file-a', userId: 'user-b' } });
    expect(res.status).toBe(404);
  });
});
