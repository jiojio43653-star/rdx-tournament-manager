import { doc, getDoc, setDoc, onSnapshot, updateDoc, deleteDoc, collection } from 'firebase/firestore';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { db } from '../lib/firebase';
import { AppSettings } from '../types';

export default function Admin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already logged in
    if (localStorage.getItem('isAdmin') === 'true') {
      navigate('/admin/dashboard');
      return;
    }

    // Fetch settings to check if admin auth is configured
    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'app'));
        if (snap.exists()) {
          setSettings(snap.data() as AppSettings);
        }
      } catch (e) {
        console.error('Failed to fetch settings', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, [navigate]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if custom admin auth is configured
    if (settings?.adminAuth?.email && settings?.adminAuth?.password) {
      if (email === settings.adminAuth.email && password === settings.adminAuth.password) {
        localStorage.setItem('isAdmin', 'true');
        navigate('/admin/dashboard');
      } else {
        setError('Invalid admin credentials');
      }
    } else {
      // Fallback to env password if no custom auth is set
      const adminPass = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';
      if (password === adminPass) {
        localStorage.setItem('isAdmin', 'true');
        navigate('/admin/dashboard');
      } else {
        setError('Invalid admin password');
      }
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-black" />;
  }

  const isCustomAuth = !!(settings?.adminAuth?.email && settings?.adminAuth?.password);

  return (
    <div className="max-w-md mx-auto min-h-screen pt-20 px-4 flex flex-col items-center bg-black">
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6 border border-primary/20">
        <ShieldAlert className="text-primary" size={28} />
      </div>
      
      <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">Admin Access</h1>
      <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-8 text-center">Restricted area. Please authenticate to access the dashboard.</p>

      <form onSubmit={handleLogin} className="w-full space-y-4">
        {isCustomAuth && (
          <div>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-4 text-center text-white focus:outline-none focus:border-primary transition-colors font-mono"
              placeholder="Admin Email"
            />
          </div>
        )}
        
        <div>
          <input 
            type="password" 
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-4 text-center text-white focus:outline-none focus:border-primary transition-colors tracking-[0.5em] font-mono"
            placeholder="••••••••"
          />
        </div>
        
        {error && <p className="text-red-500 text-xs font-bold uppercase text-center">{error}</p>}

        <button 
          type="submit" 
          className="w-full bg-white text-black hover:bg-zinc-200 font-black italic tracking-tighter uppercase py-4 rounded-xl transition-colors mt-4 text-sm"
        >
          Authenticate
        </button>
      </form>
    </div>
  );
}
