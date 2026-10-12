import { useState } from 'react';
import { apiFetch } from '../api';

function Auth({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function updateField(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body =
        mode === 'login'
          ? { email: form.email, password: form.password }
          : { name: form.name, email: form.email, password: form.password };
      const data = await apiFetch(path, { method: 'POST', body, auth: false });
      onAuth(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function toggleMode() {
    setMode((current) => (current === 'login' ? 'register' : 'login'));
    setError('');
  }

  return (
    <div className="auth">
      <h1>SocialProxima</h1>
      <p className="muted">Meet people around you.</p>
      <form onSubmit={submit}>
        {mode === 'register' && (
          <input placeholder="Name" value={form.name} onChange={updateField('name')} />
        )}
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={updateField('email')}
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={updateField('password')}
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" className="primary" disabled={busy}>
          {busy ? '…' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>
      </form>
      <button className="link" onClick={toggleMode}>
        {mode === 'login' ? 'Need an account? Register' : 'Have an account? Log in'}
      </button>
    </div>
  );
}

export default Auth;
