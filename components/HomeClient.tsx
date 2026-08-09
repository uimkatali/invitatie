'use client';

import { useState, type CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import RevealMessage from './RevealMessage';
import Countdown from './Countdown';
import LoginGate from './LoginGate';
import type { PublicSettings } from '../lib/get-public-settings';
import type { ResolvedTheme } from '../lib/themes';
import type { MediaItem, MediaZone } from '../lib/media';

const ParticleScene = dynamic(() => import('./ParticleScene'), { ssr: false });

interface HomeClientProps {
  settings: PublicSettings;
  theme: ResolvedTheme;
  media: MediaItem[];
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v)$/i.test(url);
}

function latestForZone(media: MediaItem[], zone: MediaZone): MediaItem | null {
  return media.find((item) => item.zone === zone) ?? null;
}

function ZoneBackground({ item }: { item: MediaItem | null }) {
  if (!item) return null;
  return (
    <div className="zone-background" aria-hidden="true">
      {isVideoUrl(item.url) ? (
        <video src={item.url} autoPlay loop muted playsInline />
      ) : (
        <img src={item.url} alt="" />
      )}
    </div>
  );
}

function GallerySection({ items }: { items: MediaItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="gallery-section">
      <div className="gallery-grid">
        {items.map((item) => (
          <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="gallery-item">
            {isVideoUrl(item.url) ? (
              <video src={item.url} muted />
            ) : (
              <img src={item.url} alt="" loading="lazy" />
            )}
          </a>
        ))}
      </div>
    </section>
  );
}

export default function HomeClient({ settings, theme, media }: HomeClientProps) {
  const [revealed, setRevealed] = useState(false);

  const heroBackground = latestForZone(media, 'heroBackground');
  const revealBackground = latestForZone(media, 'revealBackground');
  const galleryItems = media.filter((item) => item.zone === 'gallery');

  const themeStyle = {
    '--color-bg-dark': theme.colors.bgDark,
    '--color-bg-mid': theme.colors.bgMid,
    '--color-accent-blue': theme.colors.accentPrimary,
    '--color-accent-pink': theme.colors.accentSecondary,
    '--color-cream': theme.colors.cream,
  } as CSSProperties;

  return (
    <div style={themeStyle}>
      <LoginGate
        title={settings.login.title}
        hint={settings.login.hint}
        usernameLabel={settings.login.usernameLabel}
        passwordLabel={settings.login.passwordLabel}
        submitText={settings.login.submitText}
        errorText={settings.login.errorText}
        expectedUsername={settings.login.expectedUsername}
        expectedPassword={settings.login.expectedPassword}
      >
        <main>
          <div className="scene-container">
            <ZoneBackground item={heroBackground} />
            <ParticleScene theme={theme} />
          </div>
          {!revealed ? (
            <div className="reveal-wrap">
              <ZoneBackground item={revealBackground} />
              <RevealMessage
                steps={settings.website.revealSteps}
                tapPrompt={settings.website.tapPrompt}
                introLine={settings.website.introLine}
                onComplete={() => setRevealed(true)}
              />
            </div>
          ) : (
            <div className="countdown-wrap">
              <Countdown
                targetISO={settings.eventDateIso}
                label={settings.website.countdownLabel}
                completeLabel={settings.website.countdownCompleteLabel}
              />
            </div>
          )}
          <GallerySection items={galleryItems} />
        </main>
      </LoginGate>
    </div>
  );
}
