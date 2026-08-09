'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '1.5rem',
        background: 'var(--color-bg-dark, #2a1f3d)',
        color: 'var(--color-cream, #fdf0e0)',
        fontFamily: 'Georgia, "Times New Roman", serif',
      }}
    >
      <p style={{ fontSize: '1.2rem', maxWidth: '32ch', lineHeight: 1.5, marginBottom: '1.5rem' }}>
        Ceva nu a mers bine. Incearca din nou in cateva momente.
      </p>
      <button
        onClick={() => reset()}
        style={{
          padding: '0.7rem 1.5rem',
          borderRadius: '8px',
          border: 'none',
          background: 'var(--color-accent-blue, #7fc4e8)',
          color: 'var(--color-bg-dark, #2a1f3d)',
          fontWeight: 'bold',
          fontSize: '1rem',
          cursor: 'pointer',
        }}
      >
        Reincearca
      </button>
    </div>
  );
}
