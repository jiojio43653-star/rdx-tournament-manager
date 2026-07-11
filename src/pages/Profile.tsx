import React, { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { uploadToCloudinary } from '../lib/utils';
import { User as UserIcon, Camera, Save, Loader2 } from 'lucide-react';

export default function Profile() {
  const { user, profile, loading: authLoading, refreshProfile, signIn, logOut } = useAuth();
  
  const [name, setName] = useState('');
  const [gameUid, setGameUid] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setGameUid(profile.gameUid || '');
      setPhotoUrl(profile.photoUrl || '');
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    try {
      let currentPhotoUrl = photoUrl;
      
      // If photo exists, upload it FIRST
      if (photo) {
        try {
          currentPhotoUrl = await uploadToCloudinary(photo, 'image');
          setPhotoUrl(currentPhotoUrl);
          setPhoto(null);
        } catch (err) {
          console.error("Photo upload failed", err);
          alert('Failed to upload photo. Please check Cloudinary configuration.');
          setSaving(false);
          return; // Stop saving if photo fails
        }
      }

      await setDoc(doc(db, 'players', user.uid), {
        name,
        gameUid,
        photoUrl: currentPhotoUrl
      }, { merge: true });
      await refreshProfile();
      setSaving(false);
      
      alert('Profile saved successfully!');
    } catch (error) {
      console.error(error);
      alert('Failed to save profile.');
      setSaving(false);
    }
  };

  if (authLoading) return <div className="text-center py-20 text-zinc-500 font-bold tracking-widest text-xs uppercase">Loading...</div>;

  if (!user) {
    return (
      <div className="max-w-md mx-auto min-h-screen pt-4 pb-8 px-4 bg-black flex flex-col items-center justify-center">
        <UserIcon size={48} className="text-zinc-600 mb-4" />
        <h1 className="text-2xl font-black italic tracking-tighter text-white uppercase mb-2">Guest Account</h1>
        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest text-center mb-8">Sign in with Google to manage your profile and join tournaments.</p>
        <button 
          onClick={signIn}
          className="w-full bg-white text-black font-black italic uppercase tracking-tighter py-4 rounded-xl flex items-center justify-center gap-2 transition-colors hover:bg-zinc-200"
        >
          Sign In With Google
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen pb-8 px-4 bg-black">
      <header className="mb-8 text-center pt-12 pb-4 sticky top-0 z-50 bg-black/95 backdrop-blur-sm border-b border-white/5 mx-[-16px] px-4">
        <h1 className="text-[28px] font-black italic tracking-tighter text-white uppercase">Player Profile</h1>
        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Manage your identity and Game UID</p>
      </header>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-zinc-900 border-2 border-white/10 overflow-hidden flex items-center justify-center">
              {photo ? (
                <img src={URL.createObjectURL(photo)} alt="Preview" className="w-full h-full object-cover" />
              ) : photoUrl ? (
                <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={32} className="text-zinc-600" />
              )}
            </div>
            <label className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full cursor-pointer hover:bg-orange-500 transition-colors border-2 border-black">
              <Camera size={14} />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setPhoto(e.target.files[0]);
                }
              }} />
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-widest">In-Game Name</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors font-bold"
              placeholder="e.g. RDX_Ninja"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-widest">Game UID</label>
            <input 
              type="text" 
              required
              value={gameUid}
              onChange={(e) => setGameUid(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors font-mono"
              placeholder="e.g. 1234567890"
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={saving}
          className="w-full bg-primary hover:bg-orange-500 text-white font-black italic uppercase tracking-tighter py-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 mt-4 text-sm"
        >
          {saving ? <Loader2 className="animate-spin" /> : <Save size={18} />}
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
      
      <div className="mt-8 pt-8 border-t border-zinc-900">
        <button 
          onClick={logOut}
          className="w-full bg-transparent border border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-900 font-bold uppercase tracking-widest text-xs py-3 rounded-lg transition-colors"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
