import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';

import ForgotPasswordPage from '../src/app/forgot-password/page';

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('submits identifier and shows generic success message', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'ok' }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText(/email or username/i), { target: { value: 'alice' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/if an account exists/i)).toBeInTheDocument();
    });
  });

  it('renders reset link when debug reset_url is returned', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ resetUrl: '/reset-password?token=abc' }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText(/email or username/i), { target: { value: 'alice' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /continue to reset/i })).toBeInTheDocument();
    });
  });
});
