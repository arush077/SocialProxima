import { useEffect, useState } from 'react';
import './App.css';
import Auth from './components/Auth';
import Home from './components/Home';
import Discovery from './components/Discovery';
import Chat from './components/Chat';
import { apiFetch, getToken, setToken } from './api';

function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(getToken()));
  const [view, setView] = useState('home');
  const [nearby, setNearby] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    apiFetch('/api/auth/me')
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setChecking(false));
  }, []);

  function handleAuth(data) {
    setToken(data.token);
    setUser(data.user);
    setView('home');
  }

  function logout() {
    setToken(null);
    setUser(null);
    setNearby([]);
    setActiveConversation(null);
    setView('home');
  }

  if (checking) {
    return <div className="splash">Loading…</div>;
  }

  if (!user) {
    return <Auth onAuth={handleAuth} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <span className="brand">SocialProxima</span>
        <nav>
          <button
            className={view === 'home' ? 'active' : ''}
            onClick={() => setView('home')}
          >
            Home
          </button>
          <button
            className={view === 'discovery' ? 'active' : ''}
            onClick={() => setView('discovery')}
          >
            Nearby
          </button>
          <button
            className={view === 'chat' ? 'active' : ''}
            onClick={() => setView('chat')}
          >
            Chats
          </button>
        </nav>
        <button className="link" onClick={logout}>
          Log out ({user.name})
        </button>
      </header>

      <main className="app-main">
        {view === 'home' && (
          <Home
            onResults={(users) => {
              setNearby(users);
              setView('discovery');
            }}
          />
        )}

        {view === 'discovery' && (
          <Discovery
            users={nearby}
            onOpenChat={(conversation) => {
              setActiveConversation(conversation);
              setView('chat');
            }}
          />
        )}

        {view === 'chat' && (
          <Chat me={user} initialConversation={activeConversation} />
        )}
      </main>
    </div>
  );
}

export default App;
