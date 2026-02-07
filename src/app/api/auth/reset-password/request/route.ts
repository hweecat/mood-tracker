import db from '@/lib/db';
import crypto from 'crypto';
import { apiError, apiSuccess } from '@/lib/api-utils';

export async function POST(request: Request) {
  try {
    const { identifier } = await request.json();

    if (!identifier) {
      return apiError('Email or username is required', 400);
    }

    // Find user by email or name (assuming demo user '1' for this local app if it matches)
    const user = db.prepare("SELECT id, email FROM users WHERE email = ? OR name = ?").get(identifier, identifier) as { id: string, email: string } | undefined;

    // Security: Don't reveal if user exists, but for this local app we'll be more direct
    if (!user) {
      // Still return success to prevent user enumeration in a real app
      // But here we'll just log it
      console.log(`Password reset requested for non-existent user: ${identifier}`);
      return apiSuccess({ message: 'If an account exists, a reset link has been sent.' });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = Date.now() + 3600000; // 1 hour

    // Save token
    const stmt = db.prepare(`
      INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(crypto.randomUUID(), user.id, tokenHash, expiresAt, Date.now());

    // In a real app, send email. Here, we log the link.
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password/${token}`;
    console.log(`
--- PASSWORD RESET LINK ---
User: ${user.email}
Link: ${resetUrl}
---------------------------
`);

    return apiSuccess({ message: 'Reset link generated. Check console for the link.' });
  } catch (error) {
    console.error('Reset request error:', error);
    return apiError('Internal Server Error');
  }
}
