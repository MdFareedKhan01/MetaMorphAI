import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { getUser, setToken } from '../api';

type AppShellProps = { children: ReactNode };

function ProfileIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 20c.6-3.25 2.65-5 6.5-5s5.9 1.75 6.5 5" />
    </svg>
  );
}

export default function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    function closeProfile(event: MouseEvent) {
      if (event.target instanceof Element && !event.target.closest('.profile-menu')) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('click', closeProfile);
    return () => document.removeEventListener('click', closeProfile);
  }, []);

  function signOut() {
    setToken(null);
    setProfileOpen(false);
    setMenuOpen(false);
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-header__inner">
          <Link className="brand" to={user ? '/' : '/login'} onClick={() => setMenuOpen(false)}>
            <span className="brand__mark" aria-hidden="true">M</span>
            <span className="brand__name">MetaMorph<span>-AI</span></span>
          </Link>

          <button
            className="menu-toggle"
            type="button"
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span /><span /><span />
          </button>

          <nav className={`site-nav${menuOpen ? ' site-nav--open' : ''}`} aria-label="Main navigation">
            {user ? (
              <>
                <Link className={isActive('/') ? 'site-nav__link site-nav__link--active' : 'site-nav__link'} to="/" onClick={() => setMenuOpen(false)}>New source</Link>
                <Link className={isActive('/gallery') ? 'site-nav__link site-nav__link--active' : 'site-nav__link'} to="/gallery" onClick={() => setMenuOpen(false)}>Gallery</Link>
              </>
            ) : (
              <>
                <Link className={isActive('/login') ? 'site-nav__link site-nav__link--active' : 'site-nav__link'} to="/login" onClick={() => setMenuOpen(false)}>Sign in</Link>
                <Link className={isActive('/signup') ? 'site-nav__link site-nav__link--active' : 'site-nav__link'} to="/signup" onClick={() => setMenuOpen(false)}>Create account</Link>
              </>
            )}
          </nav>

          <div className="profile-menu">
            <button
              className="profile-button"
              type="button"
              aria-label={user ? `Open profile for ${user.name}` : 'Open account menu'}
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen((open) => !open)}
            >
              <span className="profile-button__icon"><ProfileIcon /></span>
              {user && <span className="profile-button__name">{user.name}</span>}
              <span className="profile-button__chevron" aria-hidden="true">⌄</span>
            </button>
            {profileOpen && (
              <div className="profile-popover">
                {user ? (
                  <>
                    <p className="profile-popover__label">Signed in as</p>
                    <p className="profile-popover__name">{user.name}</p>
                    <p className="profile-popover__role">{user.role}</p>
                    <button className="profile-popover__action" type="button" onClick={signOut}>Sign out</button>
                  </>
                ) : (
                  <Link className="profile-popover__action" to="/login" onClick={() => setProfileOpen(false)}>Sign in</Link>
                )}
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="app-shell__content">{children}</div>
    </div>
  );
}