import { useState } from 'react';
import { apiFetch } from '../api';

function Home({ onResults }) {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');

  function findNearby() {
    setError('');

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { longitude, latitude } = position.coords;
        try {
          await apiFetch('/api/users/me/location', {
            method: 'PUT',
            body: { longitude, latitude, discoveryEnabled: true },
          });
          const data = await apiFetch('/api/discovery/nearby', {
            method: 'POST',
            body: { longitude, latitude, radius: 10000 },
          });
          onResults(data.users || []);
        } catch (err) {
          setError(err.message);
        } finally {
          setLocating(false);
        }
      },
      (geoError) => {
        setLocating(false);
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setError('Location permission denied. Enable it to find people nearby.');
        } else {
          setError('Could not get your location. Please try again.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  return (
    <div className="home">
      <h1>Find people nearby</h1>
      <p className="muted">
        Share your location to discover people around you. Your exact coordinates are never
        shown to others.
      </p>
      <button className="primary big" onClick={findNearby} disabled={locating}>
        {locating ? 'Locating…' : 'Find people nearby'}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export default Home;
