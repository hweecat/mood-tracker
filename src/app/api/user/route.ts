import db from '@/lib/db';
import { z } from 'zod';
import { getSessionUser, apiError, apiSuccess } from '@/lib/api-utils';

const UserUpdateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

export async function PUT(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return apiError('Unauthorized', 401);
    }

    const body = await request.json();
    const validatedData = UserUpdateSchema.parse(body);
    const { name, email } = validatedData;

    const stmt = db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?');
    const result = stmt.run(name, email, user.id);

    if (result.changes === 0) {
      return apiError('User not found', 404);
    }

    return apiSuccess({ success: true, user: { name, email } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError('Invalid input', 400, error.issues);
    }
    console.error('User update error:', error);
    return apiError('Internal Server Error');
  }
}
