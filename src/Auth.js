import React, { useState } from 'react';
import { supabase } from './supabase';

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nama, setNama] = useState('');
  const [loading, setLoading] = useState(false);
  const [pesan, setPesan] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    setPesan('');

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setPesan('❌ ' + error.message);
      else onLogin(null);
    } else {
      const { error } = await supabase.auth.signUp({
  email, password,
  options: { data: { nama } }
});
      if (error) setPesan('❌ ' + error.message);
      else setPesan('✅ Registrasi berhasil! Cek email untuk verifikasi.');
    }
    setLoading(false);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0,
      width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.5)',
      zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: 'white', borderRadius: '12px',
        padding: '24px', width: '300px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '28px' }}>🌾</div>
          <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#2d6a4f' }}>
            Serumpun Padi
          </div>
          <div style={{ fontSize: '12px', color: '#888' }}>
            {mode === 'login' ? 'Masuk ke akun Anda' : 'Buat akun baru'}
          </div>
        </div>

        {mode === 'register' && (
          <input
            placeholder="Nama lengkap"
            value={nama}
            onChange={e => setNama(e.target.value)}
            style={inputStyle}
          />
        )}

        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={inputStyle}
        />

        {pesan && (
          <div style={{ fontSize: '12px', marginBottom: '10px',
            color: pesan.startsWith('✅') ? '#2d6a4f' : '#e74c3c',
            background: pesan.startsWith('✅') ? '#d8f3dc' : '#fde8e8',
            padding: '8px', borderRadius: '6px' }}>
            {pesan}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', padding: '10px',
            background: '#2d6a4f', color: 'white',
            border: 'none', borderRadius: '8px',
            fontSize: '13px', fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: '10px', opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? '⏳ Memproses...' : mode === 'login' ? '🔐 Masuk' : '📝 Daftar'}
        </button>

        <div style={{ textAlign: 'center', fontSize: '12px', color: '#888' }}>
          {mode === 'login' ? (
            <>Belum punya akun? <span onClick={() => { setMode('register'); setPesan(''); }}
              style={{ color: '#2d6a4f', cursor: 'pointer', fontWeight: 'bold' }}>Daftar</span></>
          ) : (
            <>Sudah punya akun? <span onClick={() => { setMode('login'); setPesan(''); }}
              style={{ color: '#2d6a4f', cursor: 'pointer', fontWeight: 'bold' }}>Masuk</span></>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '10px' }}>
          <span onClick={() => onLogin(null)}
            style={{ fontSize: '11px', color: '#aaa', cursor: 'pointer' }}>
            Lanjut sebagai Tamu (Read Only)
          </span>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '9px',
  marginBottom: '10px',
  borderRadius: '6px',
  border: '1px solid #ddd',
  fontSize: '13px',
  boxSizing: 'border-box'
};