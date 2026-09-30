'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Countdown from '@/components/Countdown';
import type { ThemeId } from '@/lib/domain';
import { REVEAL_FALLBACK_MS, titleDelayMs } from '@/lib/scene/reveal';
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
    // Reveal-ul porneste cand canvas-ul randeaza primul cadru (revealAt); titlul urmeaza dupa el.
    sceneStore.set({ theme, mode: 'experience', revealPending: !reduced });

    let timer: number | undefined;
    let shown = false;
    const show = () => {
      shown = true;
      setRevealed(true);
    };
    const schedule = () => {
      if (shown || timer !== undefined) return;
      const { webgl, revealAt } = sceneStore.get();
      const delay = titleDelayMs({ reduced, webgl, revealAt, now: nowSeconds() });
      if (delay !== null) timer = window.setTimeout(show, delay);
    };
    const unsubscribe = sceneStore.subscribe(schedule);
    schedule();
    // Canvas lent sau absent: titlul apare oricum, iar reveal-ul cu inima nu mai porneste.
    const fallback = window.setTimeout(() => {
      if (timer !== undefined || shown) return;
      sceneStore.set({ revealPending: false });
      show();
    }, REVEAL_FALLBACK_MS);

    return () => {
      unsubscribe();
      window.clearTimeout(fallback);
      window.clearTimeout(timer);
      sceneStore.reset();
    };
  }, [theme]);

  useEffect(() => {
    root.current?.classList.add('js-ready');
  }, []);

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
      // Sectiunea conteaza cand varful ei intra in partea de sus (75%) a ecranului; functioneaza si pentru sectiuni
      // mai inalte decat ecranul, unde un prag de raport de intersectie nu s-ar atinge niciodata.
      { threshold: 0, rootMargin: '0px 0px -25% 0px' },
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
        <p className="exp-scroll-hint">
          Deruleaza <span aria-hidden="true">↓</span>
        </p>
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
