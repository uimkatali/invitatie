'use client';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="center-screen">
      <div className="sky" data-theme="amandoua" aria-hidden="true" />
      <div className="card card-strong stack" style={{ maxWidth: 420, position: 'relative' }}>
        <h1>Ups</h1>
        <p>Ceva n-a mers. Incearca din nou.</p>
        <button type="button" className="btn btn-primary" onClick={reset}>
          Reincearca
        </button>
      </div>
    </main>
  );
}
