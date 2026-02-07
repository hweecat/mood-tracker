import db from '@/lib/db';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { apiError, apiSuccess } from '@/lib/api-utils';
import { z } from 'zod';

const ResetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(4), // Demo security
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = ResetPasswordSchema.parse(body);
    const { token, password } = validatedData;

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find valid token
    const tokenRecord = db.prepare(`
      SELECT * FROM password_reset_tokens 
      WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?
    `).get(tokenHash, Date.now()) as { id: string, user_id: string } | undefined;

    if (!tokenRecord) {
      return apiError('Invalid or expired token', 400);
    }

    // Update password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Use transaction for atomic update
    const updateTransaction = db.transaction(() => {
      db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, tokenRecord.user_id);
      db.prepare("UPDATE password_reset_tokens SET used_at = ? WHERE id = ?").run(Date.now(), tokenRecord.id);
    });

    updateTransaction();

    return apiSuccess({ message: 'Password reset successfully!' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError('Invalid input', 400, error.issues);
    }
    console.error('Reset verify error:', error);
    return apiError('Internal Server Error');
  }
}
