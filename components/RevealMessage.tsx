'use client';

import { useState } from 'react';
import { nextStepIndex } from '../lib/reveal';

interface RevealMessageProps {
  steps: string[];
  tapPrompt: string;
  onComplete: () => void;
}

export default function RevealMessage({ steps, tapPrompt, onComplete }: RevealMessageProps) {
  const [stepIndex, setStepIndex] = useState(0);

  function handleTap() {
    const next = nextStepIndex(stepIndex, steps.length);
    if (next === -1) {
      onComplete();
    } else {
      setStepIndex(next);
    }
  }

  return (
    <div className="reveal" onClick={handleTap}>
      <p className="reveal-text">{steps[stepIndex]}</p>
      <p className="reveal-prompt">{tapPrompt}</p>
    </div>
  );
}
