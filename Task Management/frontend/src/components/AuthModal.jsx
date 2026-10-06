import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle, Loader2, Eye, EyeOff, Mail, Lock, Unlock, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { api } from '../api';

export function AuthModal({ initialMode = 'signin', onClose, onSuccess }) {
  // 'signin' | 'signup' | 'forgot' | 'forgot-sent' | 'reset'
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [sentEmail, setSentEmail] = useState(''); // stores the email shown on the confirmation screen
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Invitation parameters
  const [inviteWorkspace, setInviteWorkspace] = useState('');
  const [inviteRole, setInviteRole] = useState('');

  // On mount, check URL for a reset token (e.g. /reset-password?token=abc123)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token');
    if (tokenFromUrl) {
      setResetToken(tokenFromUrl);
      setMode('reset');
      // Clean the URL so the token doesn't linger in the address bar
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Check for invitation parameters
    const inviteFromUrl = params.get('invite');
    const workspaceFromUrl = params.get('workspace');
    const emailFromUrl = params.get('email');

    if (inviteFromUrl === '1' && workspaceFromUrl) {
      // Store invitation parameters
      setInviteWorkspace(workspaceFromUrl);
      setInviteRole('member'); // default role for invites

      // Pre-fill email if provided in invite
      if (emailFromUrl) {
        setEmail(emailFromUrl);
      }
      // Switch to signup mode if coming from an invite
      setMode('signup');

      // Clean the URL so invite params don't linger
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Helper to switch modes and reset form cleanly
  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setSuccessMessage('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    if (newMode === 'signin') setName('');
    if (newMode === 'forgot') setResetToken('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setSuccessMessage('');

    try {
      if (mode === 'signup') {
        if (!email.trim()) {
          setError('Please enter your email address.');
          return;
        }
        if (!name.trim()) {
          setError('Please enter your full name.');
          return;
        }
        if (!password || password.length < 8) {
          setError('Password must be at least 8 characters.');
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          return;
        }

        setLoading(true);
        const data = await api.signup(name.trim(), email.trim(), password, inviteWorkspace, inviteRole);

        // Show success message if user was added to workspace
        if (data.invitedWorkspace) {
          setSuccessMessage(`Welcome! You've been added to "${data.invitedWorkspace.name}" workspace.`);
          // Brief delay to show the message before closing
          setTimeout(() => onSuccess(data.user), 1500);
        } else {
          onSuccess(data.user);
        }
      } else if (mode === 'signin') {
        if (!email.trim()) {
          setError('Please enter your email address.');
          return;
        }
        if (!password) {
          setError('Please enter your password.');
          return;
        }

        setLoading(true);
        const data = await api.signin(email.trim(), password);
        onSuccess(data.user);
      } else if (mode === 'forgot') {
        if (!email.trim()) {
          setError('Please enter your email address.');
          return;
        }

        setLoading(true);
        await api.forgotPassword(email.trim());
        // Store the email for display on the confirmation screen, then switch
        setSentEmail(email.trim());
        setMode('forgot-sent');
      } else if (mode === 'reset') {
        if (!resetToken.trim()) {
          setError('Please enter the reset token.');
          return;
        }
        if (!password || password.length < 8) {
          setError('Password must be at least 8 characters.');
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          return;
        }

        setLoading(true);
        await api.resetPassword(resetToken.trim(), password);
        setSuccessMessage('Password has been successfully reset. You can now sign in.');
        setTimeout(() => switchMode('signin'), 3000);
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Account Helper
  const handleQuickDemo = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setError('');
    setLoading(true);
    try {
      const demoEmail = 'demo@taskflow.dev';
      const demoPass = 'Password123!';
      try {
        const data = await api.signin(demoEmail, demoPass);
        onSuccess(data.user);
      } catch (signinErr) {
        const data = await api.signup('Demo User', demoEmail, demoPass);
        onSuccess(data.user);
      }
    } catch (err) {
      setError('Demo mode unavailable. Please sign up or sign in with a real account.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Forgot Password: Email input form (no nested <form>) ── */
  const renderForgotPassword = () => (
    <>
      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
        <label className="form-label">Email</label>
        <input
          type="email"
          className="form-input"
          placeholder="you@domain.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          autoFocus
        />
      </div>
      <button
        type="submit"
        className="btn btn-primary"
        style={{ width: '100%', padding: '0.8rem', fontSize: '1rem' }}
        disabled={loading}
      >
        {loading ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <Loader2 size={18} className="animate-spin" /> Sending...
          </span>
        ) : (
          'Send reset link'
        )}
      </button>
    </>
  );

  /* ── Forgot-Sent: Confirmation screen (matches the reference screenshot) ── */
  const renderForgotSent = () => (
    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          backgroundColor: '#ECFDF5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem',
        }}
      >
        <Mail size={30} style={{ color: '#059669' }} />
      </div>
      <h2
        className="font-serif"
        style={{
          fontSize: '1.75rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: '0.75rem',
        }}
      >
        Forgot your password?
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
        If an account exists for <strong style={{ color: 'var(--text-primary)' }}>{sentEmail}</strong>, a reset link is on its way. Check your inbox.
      </p>
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          switchMode('signin');
        }}
        style={{
          color: 'var(--accent-terracotta)',
          fontWeight: 600,
          fontSize: '0.95rem',
          textDecoration: 'none',
        }}
      >
        Back to sign in
      </a>
    </div>
  );

  /* ── Reset Password: Token + new password form (no nested <form>) ── */
  const renderResetPassword = () => (
    <>
      <div className="form-group" style={{ marginBottom: '1rem' }}>
        <label className="form-label">Reset Token</label>
        <input
          type="text"
          className="form-input"
          placeholder="Enter token from email"
          value={resetToken}
          onChange={(e) => setResetToken(e.target.value)}
          required
          autoComplete="one-time-code"
          autoFocus
        />
      </div>
      <div className="form-group" style={{ marginBottom: '1rem' }}>
        <label className="form-label">New Password</label>
        <div style={{ position: 'relative' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            className="form-input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            style={{ paddingRight: '2.5rem' }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            style={{
              position: 'absolute',
              right: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              padding: 0
            }}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </div>
      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
        <label className="form-label">Confirm New Password</label>
        <div style={{ position: 'relative' }}>
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            className="form-input"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            style={{ paddingRight: '2.5rem' }}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            style={{
              position: 'absolute',
              right: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              padding: 0
            }}
            tabIndex={-1}
          >
            {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </div>
      <button
        type="submit"
        className="btn btn-primary"
        style={{ width: '100%', padding: '0.8rem', fontSize: '1rem' }}
        disabled={loading}
      >
        {loading ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <Loader2 size={18} className="animate-spin" /> Resetting...
          </span>
        ) : (
          'Reset password'
        )}
      </button>
    </>
  );

  const renderSignIn = () => (
    <>
      <div className="form-group" style={{ marginBottom: '1.75rem' }}>
        <label className="form-label">Email</label>
        <input
          type="email"
          className="form-input"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          autoFocus
        />
      </div>

      <div className="form-group" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); switchMode('forgot'); }}
            style={{ color: 'var(--accent-terracotta)', fontSize: '0.85rem', fontWeight: 500, textDecoration: 'none' }}
          >
            Forgot password?
          </a>
        </div>
        <div style={{ position: 'relative' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            className="form-input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            style={{ paddingRight: '2.5rem' }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            style={{
              position: 'absolute',
              right: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              padding: 0
            }}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        style={{ width: '100%', padding: '0.8rem', fontSize: '1rem', marginBottom: '1rem' }}
        disabled={loading}
      >
        {loading ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Loader2 size={18} className="animate-spin" /> Signing in...
          </span>
        ) : (
          'Sign in'
        )}
      </button>

      {/* 1-Click Demo Account */}
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        style={{
          width: '100%',
          padding: '0.65rem',
          marginBottom: '1.5rem',
          fontSize: '0.875rem',
          color: 'var(--accent-terracotta)',
          borderColor: 'var(--accent-terracotta-border)',
          backgroundColor: 'var(--accent-terracotta-light)',
        }}
        onClick={handleQuickDemo}
        disabled={loading}
      >
        <Sparkles size={15} /> 1-Click Demo Mode
      </button>
    </>
  );

  const renderSignUp = () => (
    <>
      <div className="form-group" style={{ marginBottom: '1.25rem' }}>
        <label className="form-label">Full Name</label>
        <input
          type="text"
          className="form-input"
          placeholder="Alex Rivera"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoComplete="name"
          autoFocus
        />
      </div>

      <div className="form-group" style={{ marginBottom: '1.25rem' }}>
        <label className="form-label">Email</label>
        <input
          type="email"
          className="form-input"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>

      <div className="form-group" style={{ marginBottom: '1rem' }}>
        <label className="form-label">Password</label>
        <div style={{ position: 'relative' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            className="form-input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            style={{ paddingRight: '2.5rem' }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            style={{
              position: 'absolute',
              right: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              padding: 0
            }}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
        <label className="form-label">Confirm Password</label>
        <div style={{ position: 'relative' }}>
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            className="form-input"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            style={{ paddingRight: '2.5rem' }}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            style={{
              position: 'absolute',
              right: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              padding: 0
            }}
            tabIndex={-1}
          >
            {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        style={{ width: '100%', padding: '0.8rem', fontSize: '1rem', marginBottom: '1rem' }}
        disabled={loading}
      >
        {loading ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Loader2 size={18} className="animate-spin" /> Creating...
          </span>
        ) : (
          'Create account'
        )}
      </button>

      {/* 1-Click Demo Account */}
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        style={{
          width: '100%',
          padding: '0.65rem',
          marginBottom: '1.5rem',
          fontSize: '0.875rem',
          color: 'var(--accent-terracotta)',
          borderColor: 'var(--accent-terracotta-border)',
          backgroundColor: 'var(--accent-terracotta-light)',
        }}
        onClick={handleQuickDemo}
        disabled={loading}
      >
        <Sparkles size={15} /> 1-Click Demo Mode
      </button>
    </>
  );

  // Determine header content based on mode
  const getHeaderTitle = () => {
    switch (mode) {
      case 'signup': return 'Create your account';
      case 'signin': return 'Sign in to your account';
      case 'forgot': return 'Reset your password';
      case 'forgot-sent': return ''; // handled inside renderForgotSent
      case 'reset': return 'Create new password';
      default: return '';
    }
  };

  const getHeaderSubtitle = () => {
    switch (mode) {
      case 'signup': return 'Start organizing your tasks in a calmer workspace.';
      case 'signin': return 'Welcome back. Pick up right where you left off.';
      case 'forgot': return "We'll send you a link to reset your password.";
      case 'forgot-sent': return ''; // handled inside renderForgotSent
      case 'reset': return 'Your new password must be different from previous ones.';
      default: return '';
    }
  };

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            padding: '0.4rem',
            borderRadius: '50%',
            color: 'var(--text-muted)',
          }}
        >
          <X size={18} />
        </button>

        {/* Modal Header — hidden for forgot-sent (it has its own header) */}
        {mode !== 'forgot-sent' && (
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <button
              type="button"
              onClick={() => switchMode(mode === 'reset' ? 'forgot' : 'signin')}
              style={{
                position: 'absolute',
                left: '1.25rem',
                top: '1.25rem',
                padding: '0.4rem',
                borderRadius: '50%',
                color: 'var(--text-muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: mode === 'forgot' || mode === 'reset' ? 'flex' : 'none',
              }}
            >
              <ArrowLeft size={18} />
            </button>

            <h2
              className="font-serif"
              style={{
                fontSize: '2rem',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: 'var(--text-primary)',
                marginBottom: '0.4rem',
              }}
            >
              {getHeaderTitle()}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              {getHeaderSubtitle()}
            </p>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div
            style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #F87171',
              color: '#991B1B',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.25rem',
            }}
          >
            <AlertCircle size={16} flexShrink={0} />
            <span>{error}</span>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div
            style={{
              backgroundColor: '#ECFDF5',
              border: '1px solid #6EE7B7',
              color: '#065F46',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.25rem',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </span>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Forgot-Sent confirmation — standalone, no wrapping form needed */}
        {mode === 'forgot-sent' && renderForgotSent()}

        {/* Form — only rendered for modes that need a form */}
        {mode !== 'forgot-sent' && (
          <form onSubmit={handleSubmit} noValidate>
            {mode === 'forgot' && renderForgotPassword()}
            {mode === 'reset' && renderResetPassword()}
            {mode === 'signin' && renderSignIn()}
            {mode === 'signup' && renderSignUp()}
          </form>
        )}

        {/* Footer Toggle */}
        {(mode === 'signin' || mode === 'signup') && (
          <div style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {mode === 'signup' ? (
              <>
                Already have an account?{' '}
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); switchMode('signin'); }}
                  style={{ color: 'var(--accent-terracotta)', fontWeight: 600, textDecoration: 'none' }}
                >
                  Sign in
                </a>
              </>
            ) : (
              <>
                Don&apos;t have an account?{' '}
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); switchMode('signup'); }}
                  style={{ color: 'var(--accent-terracotta)', fontWeight: 600, textDecoration: 'none' }}
                >
                  Sign up
                </a>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}