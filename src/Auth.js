import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function Auth({ onLogin, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register' | 'forgot' | 'reset_password'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [nama, setNama] = useState('');
  const [loading, setLoading] = useState(false);
  const [pesan, setPesan] = useState('');

  // Sync mode jika prop initialMode berubah
  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  // Deteksi otomatis jika URL mengandung parameter recovery token
  useEffect(() => {
    const href = window.location.href || '';
    const hash = window.location.hash || '';
    const search = window.location.search || '';

    if (
      href.includes('type=recovery') ||
      href.includes('recovery') ||
      hash.includes('type=recovery') ||
      hash.includes('access_token') ||
      search.includes('type=recovery') ||
      search.includes('code=')
    ) {
      setMode('reset_password');
    }
  }, []);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setPesan('');

    // Mode 1: Reset / Buat Password Baru (dari Link Email Recovery)
    if (mode === 'reset_password') {
      if (!password || password.length < 6) {
        setPesan('❌ Password baru minimal 6 karakter.');
        return;
      }
      if (password !== confirmPassword) {
        setPesan('❌ Konfirmasi password tidak cocok.');
        return;
      }
      setLoading(true);
      const { data, error } = await supabase.auth.updateUser({ password });
      if (error) {
        setPesan('❌ ' + error.message);
      } else {
        setPesan('✅ Password baru berhasil disimpan! Anda sekarang sudah login.');
        // Bersihkan hash recovery dari URL
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, '', window.location.pathname);
        }
        setTimeout(() => {
          if (onLogin) onLogin(data?.user || null);
        }, 1500);
      }
      setLoading(false);
      return;
    }

    // Mode 2: Permintaan Kirim Link Lupa Password ke Email
    if (mode === 'forgot') {
      if (!email) {
        setPesan('❌ Masukkan email akun Anda.');
        return;
      }
      setLoading(true);
      const redirectUrl = window.location.origin + window.location.pathname;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      if (error) {
        setPesan('❌ ' + error.message);
      } else {
        setPesan('✅ Link reset password telah dikirim ke ' + email + '. Silakan buka Gmail dan klik tautan untuk memasukkan password baru!');
      }
      setLoading(false);
      return;
    }

    // Mode 3: Login Akun
    if (mode === 'login') {
      if (!email || !password) {
        setPesan('❌ Email dan Password wajib diisi.');
        return;
      }
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setPesan('❌ ' + error.message);
      } else if (onLogin) {
        onLogin(data?.user || null);
      }
      setLoading(false);
      return;
    }

    // Mode 4: Registrasi Akun Baru
    if (mode === 'register') {
      if (!email || !password) {
        setPesan('❌ Email dan Password wajib diisi.');
        return;
      }
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nama } },
      });
      if (error) {
        setPesan('❌ ' + error.message);
      } else {
        setPesan('✅ Registrasi berhasil! Silakan masuk.');
        setMode('login');
        if (data?.user && onLogin) onLogin(data.user);
      }
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (onLogin) onLogin(null);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.55)',
      backdropFilter: 'blur(4px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '28px 24px',
        width: '330px',
        maxWidth: '92vw',
        boxShadow: '0 16px 36px rgba(0, 0, 0, 0.25)',
        position: 'relative',
        animation: 'sp-fade-in 0.2s ease-out',
      }}>
        {/* Tombol "X" Close di pojok kanan atas */}
        <button
          onClick={handleClose}
          title="Tutup (Batal)"
          aria-label="Tutup"
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'none',
            border: 'none',
            fontSize: '18px',
            color: '#9ca3af',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            transition: 'color 0.15s, background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#111827'; e.currentTarget.style.background = '#f3f4f6'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.background = 'none'; }}
        >
          ✕
        </button>

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <div style={{ fontSize: '32px', marginBottom: '4px' }}>🌾</div>
          <div style={{ fontWeight: 800, fontSize: '18px', color: '#166534', letterSpacing: '-0.3px' }}>
            DKPP.Info
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px', fontWeight: 600 }}>
            {mode === 'login' && 'Masuk ke akun Anda'}
            {mode === 'register' && 'Buat akun baru'}
            {mode === 'forgot' && 'Kirim Link Reset Password'}
            {mode === 'reset_password' && '🔑 Buat & Simpan Password Baru'}
          </div>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off">
          {mode === 'register' && (
            <input
              placeholder="Nama lengkap"
              value={nama}
              onChange={e => setNama(e.target.value)}
              autoComplete="off"
              style={inputStyle}
            />
          )}

          {mode !== 'reset_password' && (
            <input
              placeholder="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="off"
              autoFocus
              style={inputStyle}
            />
          )}

          {mode !== 'forgot' && (
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <input
                placeholder={mode === 'reset_password' ? 'Masukkan Password Baru' : 'Password'}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                autoFocus={mode === 'reset_password'}
                style={{ ...inputStyle, marginBottom: 0, paddingRight: '36px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                title={showPassword ? "Sembunyikan password" : "Lihat password"}
                aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                  borderRadius: '4px',
                }}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          )}

          {mode === 'reset_password' && (
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <input
                placeholder="Konfirmasi Password Baru"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                style={{ ...inputStyle, marginBottom: 0 }}
              />
            </div>
          )}

          {mode === 'login' && (
            <div style={{ textAlign: 'right', marginTop: '-4px', marginBottom: '10px' }}>
              <span
                onClick={() => { setMode('forgot'); setPesan(''); }}
                style={{ fontSize: '11px', color: '#166534', cursor: 'pointer', fontWeight: 600 }}
              >
                Lupa Password?
              </span>
            </div>
          )}

          {pesan && (
            <div style={{
              fontSize: '11.5px',
              marginBottom: '12px',
              color: pesan.startsWith('✅') ? '#166534' : '#dc2626',
              background: pesan.startsWith('✅') ? '#dcfce7' : '#fee2e2',
              padding: '8px 10px',
              borderRadius: '6px',
              border: pesan.startsWith('✅') ? '1px solid #86efac' : '1px solid #fecaca',
              lineHeight: 1.3,
            }}>
              {pesan}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '11px',
              background: '#166534',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '14px',
              opacity: loading ? 0.7 : 1,
              boxShadow: '0 2px 6px rgba(22, 101, 52, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => !loading && (e.currentTarget.style.background = '#14532d')}
            onMouseLeave={e => !loading && (e.currentTarget.style.background = '#166534')}
          >
            {loading ? '⏳ Memproses...' : (
              mode === 'login' ? '🔐 Masuk' :
              mode === 'register' ? '📝 Daftar' :
              mode === 'forgot' ? '📧 Kirim Link Reset' :
              '💾 Simpan Password Baru'
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>
          {mode === 'login' && (
            <>
              Belum punya akun?{' '}
              <span
                onClick={() => { setMode('register'); setPesan(''); }}
                style={{ color: '#166534', cursor: 'pointer', fontWeight: 700 }}
              >
                Daftar
              </span>
            </>
          )}

          {(mode === 'register' || mode === 'forgot' || mode === 'reset_password') && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <span
                onClick={() => { setMode('login'); setPesan(''); }}
                style={{ color: '#166534', cursor: 'pointer', fontWeight: 700 }}
              >
                ← Kembali ke Login
              </span>
              {mode !== 'reset_password' && (
                <span
                  onClick={() => { setMode('reset_password'); setPesan(''); }}
                  style={{ color: '#0d9488', cursor: 'pointer', fontWeight: 600, fontSize: '11px' }}
                >
                  Input Password Baru
                </span>
              )}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '12px' }}>
          <span
            onClick={handleClose}
            style={{ fontSize: '11px', color: '#9ca3af', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Lanjut sebagai Tamu (Read Only)
          </span>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  marginBottom: '10px',
  borderRadius: '7px',
  border: '1px solid #d1d5db',
  fontSize: '12.5px',
  boxSizing: 'border-box',
  outline: 'none',
  fontFamily: 'inherit',
};