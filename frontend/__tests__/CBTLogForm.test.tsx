import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { CBTLogForm } from '@/components/CBTLogForm';
import { useCBTAnalysis } from '@/hooks/useCBTAnalysis';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the hooks
vi.mock('@/hooks/useCBTAnalysis', () => ({
  useCBTAnalysis: vi.fn(),
}));

vi.mock('@/hooks/useLocalStorage', () => ({
  useLocalStorage: vi.fn((key, initialValue) => [initialValue, vi.fn()]),
}));

// Mock Lucide icons to avoid clutter in snapshots/structural tests
vi.mock('lucide-react', () => ({
  Sparkles: () => <span data-testid="icon-sparkles" />,
  Brain: () => <span data-testid="icon-brain" />,
  Info: () => <span data-testid="icon-info" />,
  X: () => <span data-testid="icon-x" />,
  RotateCcw: () => <span data-testid="icon-rotate" />,
  ArrowRight: () => <span data-testid="icon-arrow-right" />,
  CheckCircle2: () => <span data-testid="icon-check" />,
  Smile: () => <span data-testid="icon-smile" />,
  Frown: () => <span data-testid="icon-frown" />,
  Meh: () => <span data-testid="icon-meh" />,
}));

const MOCK_ANALYSIS = {
  suggestions: [
    { distortion: 'All-or-Nothing Thinking', reasoning: 'Reason 1' }
  ],
  reframes: [
    { perspective: 'Compassionate', content: 'Reframe 1' },
    { perspective: 'Logical', content: 'Reframe 2' },
    { perspective: 'Evidence-based', content: 'Reframe 3' }
  ],
  prompt_version: '1.0.0'
};

describe('CBTLogForm Flow & Integration', () => {
  const mockSubmit = vi.fn();
  const mockAnalyze = vi.fn();
  const mockResetAnalysis = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useCBTAnalysis as any).mockReturnValue({
      analyze: mockAnalyze,
      analysis: null,
      loading: false,
      error: null,
      reset: mockResetAnalysis,
    });
  });

  it('navigates through the steps and triggers AI analysis', async () => {
    const { rerender } = render(<CBTLogForm onSubmit={mockSubmit} />);
    
    // Step 1: Situation
    const situationInput = screen.getByPlaceholderText(/I was overlooked for a promotion/i);
    fireEvent.change(situationInput, { target: { value: 'Got a low grade' } });
    fireEvent.click(screen.getByText(/Next Step/i));

    // Step 2: Automatic Thoughts
    const thoughtsInput = screen.getByPlaceholderText(/I'm incompetent/i);
    fireEvent.change(thoughtsInput, { target: { value: "I'm a failure" } });

    // Click Analyze
    const analyzeBtn = screen.getByText(/Seek AI Perspective/i);
    fireEvent.click(analyzeBtn);
    expect(mockAnalyze).toHaveBeenCalledWith('Got a low grade', "I'm a failure");

    // Simulate AI loading and then success
    (useCBTAnalysis as any).mockReturnValue({
      analyze: mockAnalyze,
      analysis: MOCK_ANALYSIS,
      loading: false,
      error: null,
      reset: mockResetAnalysis,
    });

    // Re-render to pick up the new hook state
    rerender(<CBTLogForm onSubmit={mockSubmit} />);
    
    // Check if AI results are processed (e.g., they should be added to formData.aiSuggestedDistortions)
    // Note: In the component, useEffect handles this:
    /*
    useEffect(() => {
      if (analysis) {
        setFormData(prev => ({
          ...prev,
          aiSuggestedDistortions: analysis.suggestions.map(s => s.distortion as CognitiveDistortion)
        }));
      }
    }, [analysis]);
    */

    // Move to Step 3
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
    });

    // Step 3: Identification
    expect(await screen.findByText(/Step 3 \/ 5/i)).toBeInTheDocument();
    expect(screen.getByText(/Identification/i)).toBeInTheDocument();
    
    // Check if the suggested distortion is highlighted
    const suggestedDistortionBtn = await waitFor(() => {
      const btn = screen.getByText('All-or-Nothing Thinking').closest('button');
      if (!btn?.classList.contains('bg-amber-50')) throw new Error('Not highlighted yet');
      return btn;
    });
    
    // Select it
    await act(async () => {
      fireEvent.click(suggestedDistortionBtn!);
    });
    
    // Wait for selection to be reflected
    await waitFor(() => {
      expect(screen.getByText('All-or-Nothing Thinking').closest('button')).toHaveClass('bg-slate-800');
    });

    // Small delay for stability
    await new Promise(r => setTimeout(r, 50));
    
    // Final transition to Step 4
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
    });

    // Wait for step counter to change
    await waitFor(() => {
      const stepText = screen.getByText(/Step \d \/ 5/i).textContent;
      if (!stepText?.includes('4')) throw new Error(`Still on ${stepText}`);
    }, { timeout: 3000 });

    // Step 4: Rational Response
    expect(await screen.findByText(/Mood After Reframing/i)).toBeInTheDocument();
    
    // Check reframes
    expect(await screen.findByText(/Reframe 1/i)).toBeInTheDocument();
    
    // Select it
    await act(async () => {
      fireEvent.click(screen.getByText(/Reframe 1/i));
    });
    
    const responseTextArea = screen.getByPlaceholderText(/While this promotion didn't happen/i);
    expect(responseTextArea).toHaveValue('Reframe 1');
  });

  it('displays error message if AI analysis fails', async () => {
    (useCBTAnalysis as any).mockReturnValue({
      analyze: mockAnalyze,
      analysis: null,
      loading: false,
      error: 'API failure',
      reset: mockResetAnalysis,
    });

    render(<CBTLogForm onSubmit={mockSubmit} />);
    
    // Step 1 -> Step 2
    fireEvent.change(screen.getByPlaceholderText(/I was overlooked for a promotion/i), { target: { value: 's' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
    });

    expect(await screen.findByText('API failure')).toBeInTheDocument();
  });
});
