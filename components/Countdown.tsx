'use client';

import { useEffect, useState } from 'react';
import { getTimeRemaining, pad2, TimeRemaining } from '../lib/countdown';

interface CountdownProps {
  targetISO: string;
  label: string;
  completeLabel: string;
}

export default function Countdown({ targetISO, label, completeLabel }: CountdownProps) {
  // Ora curenta nu exista la fel pe server si pe client: pana la montare afisam un placeholder
  // stabil (`--`), ca sa nu apara o diferenta la hidratare.
  const [remaining, setRemaining] = useState<TimeRemaining | null>(null);

  useEffect(() => {
    const tick = () => setRemaining(getTimeRemaining(targetISO, new Date()));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetISO]);

  if (remaining?.isComplete) {
    return <p className="countdown-complete">{completeLabel}</p>;
  }

  const unit = (value: number | undefined, suffix: string) => `${value === undefined ? '--' : pad2(value)}${suffix}`;

  return (
    <div className="countdown">
      <p className="countdown-label">{label}</p>
      <div className="countdown-units">
        <span>{unit(remaining?.days, 'z')}</span>
        <span>{unit(remaining?.hours, 'h')}</span>
        <span>{unit(remaining?.minutes, 'm')}</span>
        <span>{unit(remaining?.seconds, 's')}</span>
      </div>
    </div>
  );
}
