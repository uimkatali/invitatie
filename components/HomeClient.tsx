'use client';

import { useState, type CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import RevealMessage from './RevealMessage';
import Countdown from './Countdown';
import LoginGate from './LoginGate';
import SelectionsForm from './SelectionsForm';
import type { InviteContent } from '../lib/content';
import type { ResolvedTheme } from '../lib/themes';

const ParticleScene = dynamic(() => import('./ParticleScene'), { ssr: false });

interface HomeClientProps {
  content: InviteContent;
  theme: ResolvedTheme;
}

export default function HomeClient({ content, theme }: HomeClientProps) {
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
        title={content.login.title}
        hint={content.login.hint}
        usernameLabel={content.login.usernameLabel}
        passwordLabel={content.login.passwordLabel}
        submitText={content.login.submitText}
        errorText={content.login.errorText}
        expectedUsername={content.login.expectedUsername}
        expectedPassword={content.login.expectedPassword}
      >
        <main>
          <div className="scene-container">
            <ParticleScene theme={theme} />
          </div>
          {!revealed ? (
            <div className="reveal-wrap">
              <RevealMessage
                steps={content.website.revealSteps}
                tapPrompt={content.website.tapPrompt}
                introLine={content.website.introLine}
                onComplete={() => setRevealed(true)}
              />
            </div>
          ) : (
            <div className="countdown-wrap">
              <Countdown
                targetISO={content.eventDateISO}
                label={content.website.countdownLabel}
                completeLabel={content.website.countdownCompleteLabel}
              />
              <SelectionsForm />
            </div>
          )}
        </main>
      </LoginGate>
    </div>
  );
}
