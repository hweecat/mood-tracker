import { describe, expect, it } from 'vitest';

import { CBT_DISTORTIONS } from '@/lib/cbt-content';
import { CognitiveDistortion } from '@/types';

describe('CBT taxonomy', () => {
  it('treats catastrophizing as a canonical cognitive distortion', () => {
    const distortion: CognitiveDistortion = 'Catastrophizing';

    expect(CBT_DISTORTIONS.map(item => item.name)).toContain(distortion);
  });
});
