'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import RevealMessage from '../components/RevealMessage';
import Countdown from '../components/Countdown';
import LoginGate from '../components/LoginGate';
import { getContent } from '../lib/content';
import { getThemeForMonth } from '../lib/theme';

const AlienScene = dynamic(() => import('../components/AlienScene'), { ssr: false });

export default function Home() {
  const content = getContent();
  const [revealed, setRevealed] = useState(false);
  const theme = useMemo(() => getThemeForMonth(new Date().getMonth() + 1), []);

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
            <AlienScene bgColor={theme.colors.bgDark} accentColor={theme.colors.accentPrimary} />
          </div>
          {!revealed ? (
            <RevealMessage
              steps={content.website.revealSteps}
              tapPrompt={content.website.tapPrompt}
              onComplete={() => setRevealed(true)}
            />
          ) : (
            <div className="countdown-wrap">
              <Countdown
                targetISO={content.eventDateISO}
                label={content.website.countdownLabel}
                completeLabel={content.website.countdownCompleteLabel}
              />
            </div>
          )}
        </main>
      </LoginGate>
    </div>
  );
}
