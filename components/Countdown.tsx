'use client';

import { useEffect, useState } from 'react';
import { getTimeRemaining, pad2, TimeRemaining } from '../lib/countdown';

interface CountdownProps {
  targetISO: string;
  label: string;
  completeLabel: string;
}

export default function Countdown({ targetISO, label, completeLabel }: CountdownProps) {
  const [remaining, setRemaining] = useState<TimeRemaining>(() =>
    getTimeRemaining(targetISO, new Date())
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(getTimeRemaining(targetISO, new Date()));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetISO]);

  if (remaining.isComplete) {
    return <p className="countdown-complete">{completeLabel}</p>;
  }

  return (
    <div className="countdown">
      <p className="countdown-label">{label}</p>
      <div className="countdown-units">
        <span>{pad2(remaining.days)}z</span>
        <span>{pad2(remaining.hours)}h</span>
        <span>{pad2(remaining.minutes)}m</span>
        <span>{pad2(remaining.seconds)}s</span>
      </div>
    </div>
  );
}
