import SceneRoot from '@/components/scene/SceneRoot';
import LoginForm from './LoginForm';

export default function LoginPage() {
  return (
    <main className="center-screen">
      <SceneRoot />
      <div className="card card-strong stack" style={{ width: 'min(420px, 100%)', position: 'relative' }}>
        <p className="eyebrow">Doar pentru noi doi</p>
        <h1>Dateurile noastre</h1>
        <LoginForm />
      </div>
    </main>
  );
}
