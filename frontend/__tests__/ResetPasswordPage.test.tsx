import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';

const replaceMock = vi.fn();

vi.mock('next/navigation', async () => {
  return {
    useRouter: () => ({ replace: replaceMock }),
    useSearchParams: () => ({ get: (key: string) => (key === 'token' ? 'tok123' : null) }),
  };
});

import ResetPasswordClient from '../src/app/reset-password/ResetPasswordClient';

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('blocks submit when passwords do not match', async () => {
    render(<ResetPasswordClient />);

    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'different123' } });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it('submits reset and redirects on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'ok' }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<ResetPasswordClient />);

    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/login?reset=1');
    });
  });
});
