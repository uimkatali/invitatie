'use client';

import { useState } from 'react';
import { nextStepIndex } from '../lib/reveal';

interface RevealMessageProps {
  steps: string[];
  tapPrompt: string;
  introLine?: string;
  onComplete: () => void;
}

export default function RevealMessage({ steps, tapPrompt, introLine, onComplete }: RevealMessageProps) {
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
      {stepIndex === 0 && introLine ? <p className="reveal-intro">{introLine}</p> : null}
      <p className="reveal-text">{steps[stepIndex]}</p>
      <p className="reveal-prompt">{tapPrompt}</p>
    </div>
  );
}
