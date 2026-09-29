'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Countdown from '@/components/Countdown';
import type { ThemeId } from '@/lib/domain';
import { REVEAL_TITLE_DELAY_S } from '@/lib/scene/particles';
import { nowSeconds, sceneStore } from '@/lib/scene/store';

export interface ExperienceInvitation {
  title: string;
  message: string;
  location: string;
  startsAtISO: string;
  startsAtLabel: string;
  dressCode: string | null;
  fromName: string;
}

interface InvitationExperienceProps {
  invitation: ExperienceInvitation;
  theme: ThemeId;
  children: ReactNode;
}

export default function InvitationExperience({ invitation, theme, children }: InvitationExperienceProps) {
  const root = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo(0, 0);
    sceneStore.set({ theme, mode: 'experience', revealAt: nowSeconds() });
    const timer = window.setTimeout(() => setRevealed(true), reduced ? 0 : REVEAL_TITLE_DELAY_S * 1000);
    return () => {
      window.clearTimeout(timer);
      sceneStore.reset();
    };
  }, [theme]);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const section = (entry.target as HTMLElement).dataset.section;
          if (entry.isIntersecting && section !== 'reveal') entry.target.classList.add('is-visible');
          if (section === 'place') sceneStore.set({ swirl: entry.isIntersecting });
          if (section === 'answer') sceneStore.set({ settle: entry.isIntersecting });
        }
      },
      { threshold: 0.45 },
    );
    element.querySelectorAll('[data-section]').forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const lines = invitation.message.split(/\n+/).filter((line) => line.trim() !== '');

  return (
    <div ref={root} className="experience">
      <section data-section="reveal" className={`exp-section exp-reveal${revealed ? ' is-visible' : ''}`}>
        <p className="eyebrow">{invitation.fromName} te invita</p>
        <h1 className="exp-title">{invitation.title}</h1>
        <p className="exp-scroll-hint">Deruleaza ↓</p>
      </section>

      <section data-section="message" className="exp-section">
        <div className="exp-card">
          {lines.map((line, index) => (
            <p key={index} className="exp-line" style={{ transitionDelay: `${index * 140}ms` }}>
              {line}
            </p>
          ))}
        </div>
      </section>

      <section data-section="place" className="exp-section">
        <div className="exp-card">
          <p className="eyebrow">Unde</p>
          <h2>{invitation.location}</h2>
        </div>
      </section>

      <section data-section="date" className="exp-section">
        <div className="exp-card stack">
          <p className="eyebrow">Cand</p>
          <h2>{invitation.startsAtLabel}</h2>
          <Countdown targetISO={invitation.startsAtISO} label="Mai sunt" completeLabel="E acum!" />
        </div>
      </section>

      {invitation.dressCode && (
        <section data-section="dress" className="exp-section">
          <div className="exp-card">
            <p className="eyebrow">Dress code</p>
            <h2>{invitation.dressCode}</h2>
          </div>
        </section>
      )}

      <section data-section="answer" className="exp-section exp-answer">
        {children}
      </section>
    </div>
  );
}
