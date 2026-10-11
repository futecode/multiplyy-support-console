import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { NETWORK_MESSAGE } from '../api/client';
import { api } from '../api/endpoints';
import logoUrl from '../assets/logo.svg';
import { toApiError, useAuth } from '../auth/AuthContext';

interface OtpRequest {
  requestId: string;
  devOtp?: string;
}

export function LoginPage() {
  const { state, login } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [request, setRequest] = useState<OtpRequest | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (state.status === 'authenticated') {
    return <Navigate to={from && from !== '/login' ? from : '/dashboard'} replace />;
  }

  const fail = (e: unknown) => {
    const err = toApiError(e);
    setError(err.isNetwork ? NETWORK_MESSAGE : err.message);
  };

  const sendOtp = async (e?: FormEvent) => {
    e?.preventDefault();
    const p = phone.trim();
    if (!p) return setError('Enter your phone number.');
    setBusy(true);
    setError(null);
    try {
      const res = await api.sendOtp(p);
      setRequest({ requestId: res.requestId, devOtp: res.devOtp });
      setCooldown(res.retryAfterSeconds || 30);
      setOtp('');
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    if (!request) return;
    if (!otp.trim()) return setError('Enter the OTP.');
    setBusy(true);
    setError(null);
    try {
      const res = await api.verifyOtp(phone.trim(), otp.trim(), request.requestId);
      await login(res.sessionToken);
    } catch (err) {
      fail(err);
      setBusy(false);
    }
  };

  const message = error ?? (state.status === 'anonymous' ? state.notice : undefined);

  return (
    <div className="login-page">
      <aside className="login-hero">
        <div className="login-brand">
          <span className="login-logo">
            <img src={logoUrl} alt="" width={30} height={22} />
          </span>
          <span className="login-brand-text">
            <span className="login-brand-name">Multiplyy</span>
            <span className="login-brand-tag">Support Desk</span>
          </span>
        </div>

        <div className="login-message">
          <p className="login-headline">
            Behind every portfolio
            <br />
            is a <span className="login-highlight">person</span>.
          </p>
          <p className="login-subline">Solve for them, not the ticket.</p>
        </div>

        <p className="login-foot">&copy; {new Date().getFullYear()} Multiplyy</p>
      </aside>
      <main className="login-main">
        <div className="login-card">
          <h1>Sign in</h1>
          <p className="muted">Use the phone number registered for support access.</p>

          {!request ? (
            <form onSubmit={sendOtp} className="form">
              <label className="field">
                <span>Phone number</span>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  autoFocus
                />
              </label>
              <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                {busy ? 'Sending…' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={verify} className="form">
              <p className="muted">
                OTP sent to <strong>{phone.trim()}</strong>{' '}
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    setRequest(null);
                    setError(null);
                  }}
                >
                  Change
                </button>
              </p>
              {request.devOtp && <p className="hint">Dev OTP: {request.devOtp}</p>}
              <label className="field">
                <span>OTP</span>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="••••••"
                  className="otp-input"
                  autoFocus
                />
              </label>
              <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                {busy ? 'Verifying…' : 'Verify & sign in'}
              </button>
              <button type="button" className="btn btn-block" disabled={busy || cooldown > 0} onClick={() => void sendOtp()}>
                {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
              </button>
            </form>
          )}

          {message && (
            <p className="form-error" role="alert">
              {message}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
