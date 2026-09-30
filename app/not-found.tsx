import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="center-screen">
      <div className="sky" data-theme="amandoua" aria-hidden="true" />
      <div className="card card-strong stack" style={{ maxWidth: 420, position: 'relative' }}>
        <h1>Nu exista</h1>
        <p>Pagina cautata nu exista sau nu mai e disponibila.</p>
        <Link href="/" className="btn btn-primary">
          Inapoi acasa
        </Link>
      </div>
    </main>
  );
}
