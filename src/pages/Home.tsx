import { useEffect, useState, useRef } from 'react';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning,';
  if (hour < 18) return 'Good Afternoon,';
  if (hour < 22) return 'Good Evening,';
  return 'Good Night,';
};

import { collection, query, onSnapshot, where, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppSettings, Tournament, JoinRequest } from '../types';
import { Link } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { MoreVertical, Youtube, Instagram, Facebook, Send, MessageCircle, Globe, CheckCircle2 } from 'lucide-react';

export default function Home() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [csTournaments, setCsTournaments] = useState<Tournament[]>([]);
  const [userRequests, setUserRequests] = useState<Record<string, boolean>>({});
  const { profile, user } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch Settings from Firestore
    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'app'), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as AppSettings);
      }
    });

    const q = query(collection(db, 'tournaments'), where('category', '==', 'CS'));
    const unsubscribeTournaments = onSnapshot(q, (snapshot) => {
      const tData: Tournament[] = [];
      snapshot.forEach((doc) => {
        tData.push({ id: doc.id, ...doc.data() } as Tournament);
      });
      // Sort in memory by createdAt desc since we are using where
      tData.sort((a, b) => b.createdAt - a.createdAt);
      setCsTournaments(tData);
    });

    let unsubRequests = () => {};
    if (user) {
      const rq = query(collection(db, 'requests'), where('playerId', '==', user.uid));
      unsubRequests = onSnapshot(rq, (snapshot) => {
        const reqs: Record<string, boolean> = {};
        snapshot.forEach(doc => {
          const r = doc.data() as JoinRequest;
          if ((!r.type || r.type === 'Join') && (r.status === 'Approved' || r.status === 'Pending')) {
            reqs[r.tournamentId] = true;
          }
        });
        setUserRequests(reqs);
      });
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      unsubscribeSettings();
      unsubscribeTournaments();
      unsubRequests();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [user]);

  const socialIcons: Record<string, any> = {
    youtube: <Youtube size={14} />,
    instagram: <Instagram size={14} />,
    facebook: <Facebook size={14} />,
    telegram: <Send size={14} />,
    whatsapp: <MessageCircle size={14} />,
    website: <Globe size={14} />,
  };

  const homeButtonIcons: Record<string, any> = {
    youtube: <Youtube size={18} />,
    instagram: <Instagram size={18} />,
    facebook: <Facebook size={18} />,
    telegram: <Send size={18} />,
    whatsapp: <MessageCircle size={18} />,
    website: <Globe size={18} />,
  };

  const activeLinks = Object.entries(settings?.socialLinks || {}).filter(([_, url]) => !!url);

  return (
    <div className="max-w-md mx-auto min-h-screen pb-8 bg-black flex flex-col">
      {/* Header */}
      <div className="pt-12 px-4 pb-4 sticky top-0 z-50 bg-black/95 backdrop-blur-sm border-b border-white/5 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1 -ml-1 relative" ref={menuRef}>
              <button 
                className="text-zinc-500 hover:text-white transition-colors focus:outline-none p-1"
                onClick={() => setShowMenu(!showMenu)}
              >
                <MoreVertical size={14} />
              </button>
              
              {showMenu && activeLinks.length > 0 && !settings?.visibility?.social && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50">
                  {activeLinks.map(([network, url]) => {
                    if (settings?.visibility?.[`social_${network}`]) return null;
                    return (
                      <a
                        key={network}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 text-white transition-colors text-xs font-bold uppercase tracking-widest border-b border-zinc-800/50 last:border-0"
                        onClick={() => setShowMenu(false)}
                      >
                        {socialIcons[network] || <Globe size={14} />}
                        {network}
                      </a>
                    );
                  })}
                </div>
              )}
              
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold ml-1">{getGreeting()}</p>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xl font-bold text-white tracking-tight">{profile?.name || 'Guest Player'}</p>
              <div className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </div>
            </div>
          </div>
          <Link to="/profile" className="w-11 h-11 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center transition-transform active:scale-95 shadow-xl">
            {profile?.photoUrl ? (
              <img src={profile.photoUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-zinc-800 to-zinc-700 flex items-center justify-center text-zinc-400 font-bold uppercase text-lg">
                {(profile?.name || 'G').charAt(0)}
              </div>
            )}
          </Link>
        </div>
      </div>

      {/* News */}
      {settings?.news && !settings?.visibility?.news && (
        <div className="bg-primary/20 border-y border-primary/30 py-1.5 mb-4 overflow-hidden">
          <div className="whitespace-nowrap animate-marquee">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{settings.news}</span>
          </div>
        </div>
      )}

      {/* Home Buttons */}
      {settings?.homeLinks && Object.values(settings.homeLinks).some(url => !!url) && (
        <div className="px-6 mb-6">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-3">Quick Links</p>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(settings.homeLinks)
              .filter(([_, url]) => !!url)
              .map(([network, url]) => (
                <a
                  key={network}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 bg-zinc-900 border border-zinc-800/65 hover:border-zinc-700 hover:bg-zinc-900/80 rounded-xl text-white transition-all duration-200 active:scale-95 shadow-md"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    {homeButtonIcons[network] || <Globe size={18} />}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white truncate">{network}</span>
                    <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Connect</span>
                  </div>
                </a>
              ))}
          </div>
        </div>
      )}

      {/* Media Gallery (Banners/Videos) */}
      {settings?.mediaGallery && settings.mediaGallery.length > 0 && (
        <div className="mb-6 flex flex-col gap-6 px-6">
          {settings.mediaGallery
            .filter(m => !settings?.visibility?.[`media_${m.id}`])
            .sort((a, b) => a.order - b.order)
            .map((media) => (
              <div key={media.id} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden relative">
                {media.type === 'video' ? (
                  <video src={media.url} className="w-full h-auto max-h-[80vh] object-cover bg-zinc-800" controls playsInline />
                ) : (
                  <img src={media.url} alt="Feed media" className="w-full h-auto object-cover bg-zinc-800" />
                )}
              </div>
          ))}
        </div>
      )}

    </div>
  );
}
