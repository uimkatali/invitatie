'use client';

import { useState, type CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import RevealMessage from './RevealMessage';
import Countdown from './Countdown';
import LoginGate from './LoginGate';
import type { PublicSettings } from '../lib/get-public-settings';
import type { ThemeColors } from '../lib/themes';

const AlienScene = dynamic(() => import('./AlienScene'), { ssr: false });

interface HomeClientProps {
  settings: PublicSettings;
  theme: { colors: ThemeColors };
}

export default function HomeClient({ settings, theme }: HomeClientProps) {
  const [revealed, setRevealed] = useState(false);

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
            <AlienScene bgColor={theme.colors.bgDark} accentColor={theme.colors.accentPrimary} />
          </div>
          {!revealed ? (
            <RevealMessage
              steps={settings.website.revealSteps}
              tapPrompt={settings.website.tapPrompt}
              introLine={settings.website.introLine}
              onComplete={() => setRevealed(true)}
            />
          ) : (
            <div className="countdown-wrap">
              <Countdown
                targetISO={settings.eventDateIso}
                label={settings.website.countdownLabel}
                completeLabel={settings.website.countdownCompleteLabel}
              />
            </div>
          )}
        </main>
      </LoginGate>
    </div>
  );
}
