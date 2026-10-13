import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { configured } from '../lib/supabase';

export function Layout() {
  const { user, adminScope, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app">
      <header className="topbar">
        <div className="wrap topbar-inner">
          <Link to="/" className="brand">
            Breathing Point <span>Care</span>
          </Link>
          <nav className="topnav">
            <a href="/">Main site</a>
            {user ? (
              <>
                <Link to={adminScope ? '/admin/dashboard' : '/dashboard'}>{adminScope ? 'Admin' : 'My dashboard'}</Link>
                <button
                  className="linklike"
                  onClick={async () => {
                    await signOut();
                    navigate('/');
                  }}
                >
                  Log out
                </button>
              </>
            ) : (
              <Link to="/login">Log in</Link>
            )}
          </nav>
        </div>
      </header>

      <main className="wrap main">
        {!configured && (
          <div className="alert alert-warn">
            This app is not connected to its database yet. Add your Supabase address and key to the <code>.env</code> file and rebuild
            (see README).
          </div>
        )}
        <Outlet />
      </main>

      <footer className="footer">
        <div className="wrap">
          Breathing Point Care lists independent yoga teachers and physiotherapists. A listing means the professional's submitted
          certificate was reviewed by our team; it is not a guarantee of any treatment or outcome.
        </div>
      </footer>
    </div>
  );
}

export function Notice({ kind, children }: { kind: 'error' | 'ok' | 'info'; children: React.ReactNode }) {
  return <div className={`alert alert-${kind}`}>{children}</div>;
}
