import { useState } from 'react';
import { apiFetch } from '../api';

function formatDistance(meters) {
  if (meters == null) return '';
  if (meters < 1000) return `~${meters} m away`;
  return `~${(meters / 1000).toFixed(1)} km away`;
}

function Discovery({ users, onOpenChat }) {
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  async function connect(user) {
    setBusyId(user.id);
    setError('');
    try {
      const data = await apiFetch(`/api/connections/request/${user.id}`, {
        method: 'POST',
      });
      onOpenChat({ id: data.conversationId, user });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (!users.length) {
    return (
      <div className="empty">
        <h2>No one nearby yet</h2>
        <p className="muted">No opted-in users within range. Try again later.</p>
      </div>
    );
  }

  return (
    <div className="discovery">
      <h2>{users.length} people nearby</h2>
      {error && <p className="error">{error}</p>}
      <ul className="cards">
        {users.map((user) => (
          <li key={user.id} className="card">
            <div className="avatar">
              {user.photo ? (
                <img src={user.photo} alt="" />
              ) : (
                <span>{user.name.charAt(0)}</span>
              )}
            </div>
            <div className="card-body">
              <h3>{user.name}</h3>
              <p className="distance">{formatDistance(user.distanceMeters)}</p>
              {user.bio && <p className="muted">{user.bio}</p>}
              {user.interests?.length > 0 && (
                <ul className="tags">
                  {user.interests.map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
              )}
            </div>
            <button
              className="primary"
              onClick={() => connect(user)}
              disabled={busyId === user.id}
            >
              {busyId === user.id ? '…' : 'Connect'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Discovery;
