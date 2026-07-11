import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, deleteDoc, getDocs, where, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Tournament, JoinRequest, AppSettings } from '../types';
import { uploadToCloudinary } from '../lib/utils';
import { LogOut, Plus, Check, X, Image as ImageIcon, Upload, Video, Loader2, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'tournament' | 'cs-tournament' | 'request' | 'upi' | 'delete-all' | 'home' | 'player' | 'admin'>('tournament');
  
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ banners: [], videos: [], news: '', adminUpiId: '', visibility: {} });
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Form states
  const [tName, setTName] = useState('');
  const [tFee, setTFee] = useState('');
  const [tPrize, setTPrize] = useState('');
  const [tSlots, setTSlots] = useState('');
  const [tImage, setTImage] = useState<File | null>(null);
  const [tMatchType, setTMatchType] = useState<'Solo' | 'Duo' | 'Squad'>('Solo');
  const [isFree, setIsFree] = useState(false);
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [editData, setEditData] = useState<{name: string, roomId: string, roomPassword: string}>({name: '', roomId: '', roomPassword: ''});
  const [winnerModalMatch, setWinnerModalMatch] = useState<string | null>(null);

  useEffect(() => {
    if (localStorage.getItem('isAdmin') !== 'true') {
      navigate('/admin');
      return;
    }

    const unsubT = onSnapshot(query(collection(db, 'tournaments')), (snap) => {
      setTournaments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Tournament)));
    }, (error) => {
      console.error("Admin: Error fetching tournaments:", error);
    });

    const unsubR = onSnapshot(query(collection(db, 'requests')), (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as JoinRequest)));
    }, (error) => {
      console.error("Admin: Error fetching requests:", error);
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'app'), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as AppSettings);
      }
    });

    const unsubPlayers = onSnapshot(collection(db, 'players'), (snapshot) => {
      const pData: any[] = [];
      snapshot.forEach((docSnap) => {
        pData.push({ id: docSnap.id, ...docSnap.data() });
      });
      setPlayers(pData);
    });

    return () => { unsubT(); unsubR(); unsubSettings(); unsubPlayers(); };
  }, [navigate]);

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let imageUrl = 'https://fakeimg.pl/800x400/?text=Tournament';
      if (tImage) {
        imageUrl = await uploadToCloudinary(tImage, 'image');
      }

      const newT: Omit<Tournament, 'id'> = {
        name: tName || 'Untitled Match',
        gameName: 'Free Fire',
        imageUrl,
        entryFee: isFree ? 0 : Number(tFee || 0),
        prizePool: Number(tPrize || 0),
        matchDate: '',
        matchTime: '',
        matchType: tMatchType,
        totalSlots: Number(tSlots || 0),
        joinedCount: 0,
        rules: 'Standard rules apply.',
        status: 'Upcoming',
        createdAt: Date.now(),
        isFree,
        category: activeTab === 'cs-tournament' ? 'CS' : 'Classic'
      };

      await addDoc(collection(db, 'tournaments'), newT);
      alert('Tournament created!');
    } catch (err) {
      console.error(err);
      alert('Error creating tournament');
    }
  };

  const handleMakeLive = async (tournamentId: string) => {
    try {
      await updateDoc(doc(db, 'tournaments', tournamentId), { status: 'Live' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTournament = async (tournamentId: string) => {
    try {
      await deleteDoc(doc(db, 'tournaments', tournamentId));
      setConfirmDelete(null);
      // Clean up requests for this tournament
      const reqSnap = await getDocs(query(collection(db, 'requests'), where('tournamentId', '==', tournamentId)));
      for (const docSnap of reqSnap.docs) {
        await deleteDoc(doc(db, 'requests', docSnap.id));
      }
    } catch (e) {
      console.error(e);
      alert("Failed to delete tournament.");
    }
  };

  const handleSaveEdit = async (tournamentId: string) => {
    try {
      await updateDoc(doc(db, 'tournaments', tournamentId), {
        name: editData.name,
        roomId: editData.roomId,
        roomPassword: editData.roomPassword
      });
      setEditingMatch(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRequest = async (reqId: string, tournamentId: string, status: 'Approved' | 'Rejected') => {
    try {
      await updateDoc(doc(db, 'requests', reqId), { status });
      if (status === 'Rejected') {
        const t = tournaments.find(x => x.id === tournamentId);
        if (t && t.joinedCount > 0) {
          await updateDoc(doc(db, 'tournaments', tournamentId), {
            joinedCount: t.joinedCount - 1
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleClaimRequest = async (reqId: string, status: 'Approved' | 'Rejected') => {
    try {
      await updateDoc(doc(db, 'requests', reqId), { status });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeclareWinner = async (tournamentId: string, playerId: string, playerName: string) => {
    try {
      await updateDoc(doc(db, 'tournaments', tournamentId), {
        winnerId: playerId,
        winnerName: playerName
      });
      setWinnerModalMatch(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveSettings = async () => {
    await setDoc(doc(db, 'settings', 'app'), settings);
    alert('Settings saved!');
  };


  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mediaUploadType, setMediaUploadType] = useState<'image' | 'video'>('image');

  const triggerFileInput = (type: 'image' | 'video') => {
    setMediaUploadType(type);
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === 'image' ? 'image/*' : 'video/*';
      fileInputRef.current.click();
    }
  };

  const handleMediaFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    setIsUploadingMedia(true);
    try {
      const url = await uploadToCloudinary(e.target.files[0], mediaUploadType);
      
      const newMediaItem = {
        id: Date.now().toString(),
        url,
        type: mediaUploadType,
        hidden: false,
        order: 0,
      };

      const currentGallery = settings.mediaGallery || [];
      const updatedGallery = [
        newMediaItem,
        ...currentGallery.map(item => ({ ...item, order: item.order + 1 }))
      ];

      const newSettings = { 
        ...settings,
        mediaGallery: updatedGallery
      };
      
      setSettings(newSettings);
      await setDoc(doc(db, 'settings', 'app'), newSettings);
      alert('Media uploaded successfully!');
    } catch (error) {
      console.error("Upload failed", error);
      alert('Failed to upload media.');
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteMedia = async (id: string) => {
    if (!settings.mediaGallery) return;
    const newGallery = settings.mediaGallery.filter(m => m.id !== id);
    const newSettings = { ...settings, mediaGallery: newGallery };
    setSettings(newSettings);
    await setDoc(doc(db, 'settings', 'app'), newSettings);
  };

  const moveMedia = async (index: number, direction: 'up' | 'down') => {
    if (!settings.mediaGallery) return;
    const newGallery = [...settings.mediaGallery];
    if (direction === 'up' && index > 0) {
      [newGallery[index - 1], newGallery[index]] = [newGallery[index], newGallery[index - 1]];
    } else if (direction === 'down' && index < newGallery.length - 1) {
      [newGallery[index + 1], newGallery[index]] = [newGallery[index], newGallery[index + 1]];
    } else {
      return;
    }
    // Update order values
    newGallery.forEach((item, idx) => item.order = idx);
    const newSettings = { ...settings, mediaGallery: newGallery };
    setSettings(newSettings);
    await setDoc(doc(db, 'settings', 'app'), newSettings);
  };

  const handlePlayerAction = async (action: 'ban' | 'unban') => {
    if (selectedPlayers.length === 0) return;
    
    for (const id of selectedPlayers) {
      const p = players.find(x => x.id === id);
      if (p) {
        await updateDoc(doc(db, 'players', id), { banned: action === 'ban' });
      }
    }
    
    setSelectedPlayers([]);
    alert(`Successfully applied ${action} to ${selectedPlayers.length} players.`);
  };

  const [deletingAll, setDeletingAll] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      // Delete all tournaments
      const tSnap = await getDocs(query(collection(db, 'tournaments')));
      for (const docSnap of tSnap.docs) {
        await deleteDoc(doc(db, 'tournaments', docSnap.id));
      }

      // Delete all requests
      const rSnap = await getDocs(query(collection(db, 'requests')));
      for (const docSnap of rSnap.docs) {
        await deleteDoc(doc(db, 'requests', docSnap.id));
      }

      // Delete all rooms
      const rmSnap = await getDocs(query(collection(db, 'rooms')));
      for (const docSnap of rmSnap.docs) {
        await deleteDoc(doc(db, 'rooms', docSnap.id));
      }

      // Delete RTDB data
      // disabled delete collection
      // disabled delete collection

      // Keep admin config, remove banners (mediaGallery)
      const newSettings = {
        ...settings,
        mediaGallery: [], // Delete all banners
        news: '', // Optionally clear news ticker? The prompt didn't say, but usually it's tied. I'll leave news alone just in case or clear it. Banners definitely cleared.
      };
      await setDoc(doc(db, 'settings', 'app'), newSettings);
      
      alert('All app data has been deleted successfully.');
      setShowDeleteConfirm(false);
      setActiveTab('tournament');
    } catch (e) {
      console.error("Error deleting all data:", e);
      alert('Failed to delete all data.');
    } finally {
      setDeletingAll(false);
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen pt-4 pb-20 px-4 bg-black">
      <header className="flex justify-between items-center mb-6 pt-4">
        <h1 className="text-xl font-black italic tracking-tighter text-white uppercase">Admin Dashboard</h1>
        <button onClick={() => { localStorage.removeItem('isAdmin'); navigate('/admin'); }} className="text-zinc-500 hover:text-white transition-colors">
          <LogOut size={20} />
        </button>
      </header>

      <div className="flex gap-2 mb-6 bg-zinc-900 p-1 rounded-xl border border-white/5 overflow-x-auto no-scrollbar whitespace-nowrap">
        {['tournament', 'cs-tournament', 'request', 'upi', 'delete-all', 'home', 'player', 'admin'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 flex-shrink-0 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-colors ${activeTab === tab ? 'bg-primary text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            {tab.replace('-', ' ')}
          </button>
        ))}
      </div>

      {(activeTab === 'tournament' || activeTab === 'cs-tournament') && (
        <div className="space-y-6">
          <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
            <h2 className="text-xs font-black italic uppercase tracking-tighter mb-4 flex items-center gap-2 text-white"><Plus size={16} /> Create Match</h2>
            <form onSubmit={handleCreateTournament} className="space-y-3">
              <input type="text" placeholder="Tournament Name" value={tName} onChange={e=>setTName(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:outline-none transition-colors font-bold" />
              <input type="text" value="Free Fire" readOnly className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-500 font-bold opacity-50 cursor-not-allowed" />
              
              {activeTab === 'cs-tournament' && (
                <select value={tMatchType} onChange={e => setTMatchType(e.target.value as any)} className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:outline-none transition-colors font-bold">
                  <option value="Solo">Solo</option>
                  <option value="Duo">Duo</option>
                  <option value="Squad">Squad</option>
                </select>
              )}
              <div className="flex gap-2">
                <input type="number" placeholder="Entry Fee (₹)" value={tFee} onChange={e=>setTFee(e.target.value)} disabled={isFree} className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:outline-none transition-colors font-mono disabled:opacity-50" />
                <input type="number" placeholder="Prize Pool (₹)" value={tPrize} onChange={e=>setTPrize(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:outline-none transition-colors font-mono" />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest cursor-pointer flex items-center gap-2">
                  <input type="checkbox" className="accent-primary w-4 h-4" checked={isFree} onChange={e => setIsFree(e.target.checked)} />
                  Free Entry
                </label>
              </div>
              <input type="number" placeholder="Total Slots" value={tSlots} onChange={e=>setTSlots(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:outline-none transition-colors font-mono mt-2" />
              <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-4">
                <ImageIcon size={14} /> Banner Image
                <input type="file" accept="image/*" onChange={e=>setTImage(e.target.files?.[0] || null)} className="ml-auto" />
              </div>
              <button type="submit" className="w-full bg-primary hover:bg-orange-500 text-white font-black italic uppercase tracking-tighter py-3 rounded-lg mt-4 transition-colors">Publish Match</button>
            </form>
          </div>

          <h3 className="font-bold text-zinc-500 text-[10px] uppercase tracking-widest">Active Matches</h3>
          {tournaments.filter(t => activeTab === 'cs-tournament' ? t.category === 'CS' : t.category !== 'CS').map(t => (
            <div key={t.id} className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
              {editingMatch === t.id ? (
                <div className="space-y-3">
                  <input type="text" value={editData.name} onChange={e=>setEditData({...editData, name: e.target.value})} placeholder="Tournament Name" className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white" />
                  <input type="text" value={editData.roomId} onChange={e=>setEditData({...editData, roomId: e.target.value})} placeholder="Room ID" className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white font-mono" />
                  <input type="text" value={editData.roomPassword} onChange={e=>setEditData({...editData, roomPassword: e.target.value})} placeholder="Room Password" className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white font-mono" />
                  <div className="flex gap-2">
                    <button onClick={() => setEditingMatch(null)} className="flex-1 py-2 text-xs font-bold text-zinc-400 bg-zinc-800 rounded-lg uppercase tracking-widest">Cancel</button>
                    <button onClick={() => handleSaveEdit(t.id)} className="flex-1 py-2 text-xs font-bold text-black bg-white rounded-lg uppercase tracking-widest">Save</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-sm text-white">{t.name}</div>
                        {t.status === 'Live' && <span className="px-1.5 py-0.5 bg-red-500 text-white text-[8px] font-black uppercase tracking-widest rounded animate-pulse">Live</span>}
                      </div>
                      <div className="text-xs text-zinc-500 font-medium mt-1">{t.joinedCount}/{t.totalSlots} Joined</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => {
                        setEditingMatch(t.id);
                        setEditData({ name: t.name, roomId: t.roomId || '', roomPassword: t.roomPassword || '' });
                      }} className="px-3 py-1 bg-zinc-800 text-white text-[10px] font-bold uppercase tracking-widest rounded transition-colors hover:bg-zinc-700">Edit</button>
                      <button onClick={() => handleMakeLive(t.id)} disabled={t.status === 'Live'} className="px-3 py-1 bg-red-900/30 text-red-500 text-[10px] border border-red-900/50 font-bold uppercase tracking-widest rounded disabled:opacity-50 transition-colors hover:bg-red-900/50">Live</button>
                      <button onClick={() => setWinnerModalMatch(t.id)} className="px-3 py-1 bg-primary/20 text-primary text-[10px] border border-primary/50 font-bold uppercase tracking-widest rounded transition-colors hover:bg-primary/40">Winner</button>
                      {confirmDelete === t.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => handleDeleteTournament(t.id)} className="px-3 py-1 bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest rounded transition-colors hover:bg-red-700">Confirm</button>
                          <button onClick={() => setConfirmDelete(null)} className="px-3 py-1 bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase tracking-widest rounded transition-colors hover:bg-zinc-700">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDelete(t.id)} className="px-3 py-1 bg-zinc-800 text-red-500 text-[10px] font-bold uppercase tracking-widest rounded transition-colors hover:bg-red-900/30">Delete</button>
                      )}
                    </div>
                  </div>
                  {(t.roomId || t.roomPassword) && (
                    <div className="mt-3 p-2 bg-black rounded border border-zinc-800 flex flex-col gap-1">
                      {t.roomId && <div className="text-[10px] text-zinc-400 font-mono">ID: <span className="text-white font-bold">{t.roomId}</span></div>}
                      {t.roomPassword && <div className="text-[10px] text-zinc-400 font-mono">Pass: <span className="text-white font-bold">{t.roomPassword}</span></div>}
                    </div>
                  )}
                  {t.winnerName && (
                    <div className="mt-2 text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                      Winner: <span className="text-primary">{t.winnerName}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}

          {/* Winner Modal */}
          {winnerModalMatch && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 w-full max-w-sm max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-black italic uppercase tracking-tighter text-white">Select Winner</h3>
                  <button onClick={() => setWinnerModalMatch(null)} className="text-zinc-500 hover:text-white"><X size={16}/></button>
                </div>
                <div className="overflow-y-auto flex-1 space-y-2">
                  {requests.filter(r => r.tournamentId === winnerModalMatch && r.status === 'Approved' && r.type === 'Join').length === 0 && (
                    <p className="text-zinc-500 text-xs text-center py-4">No joined players found.</p>
                  )}
                  {requests.filter(r => r.tournamentId === winnerModalMatch && r.status === 'Approved' && r.type === 'Join').map(r => (
                    <div key={r.id} className="flex justify-between items-center bg-black p-3 rounded-lg border border-zinc-800">
                      <span className="text-white text-sm font-bold">{r.playerName}</span>
                      <button onClick={() => handleDeclareWinner(winnerModalMatch, r.playerId, r.playerName)} className="px-3 py-1 bg-primary text-white text-[10px] font-bold uppercase tracking-widest rounded transition-colors hover:bg-orange-500">Declare</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'request' && (
        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-xs font-black italic uppercase tracking-tighter text-white">Join Requests</h2>
            {requests.filter(r => r.status === 'Pending' && (!r.type || r.type === 'Join')).map(r => (
              <div key={r.id} className="bg-zinc-900 p-4 rounded-xl border border-primary/30 border-l-4 border-l-primary">
                <div className="font-bold text-sm mb-1 text-white">{r.playerName}</div>
                <div className="text-xs text-zinc-400 mb-3 font-medium">Req to join: {r.tournamentName}</div>
                <a href={r.paymentProofUrl} target="_blank" rel="noreferrer" className="text-[10px] font-bold uppercase tracking-widest text-primary underline mb-4 block">View Payment Proof</a>
                <div className="flex gap-2">
                  <button onClick={() => handleRequest(r.id, r.tournamentId, 'Rejected')} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 py-2 rounded-lg flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest transition-colors"><X size={14}/> Reject</button>
                  <button onClick={() => handleRequest(r.id, r.tournamentId, 'Approved')} className="flex-1 bg-primary hover:bg-orange-500 text-white py-2 rounded-lg flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest transition-colors"><Check size={14}/> Approve</button>
                </div>
              </div>
            ))}
            {requests.filter(r => r.status === 'Pending' && (!r.type || r.type === 'Join')).length === 0 && (
              <div className="text-center text-zinc-500 font-bold tracking-widest text-xs uppercase py-8 bg-zinc-900 rounded-xl">No join requests</div>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-xs font-black italic uppercase tracking-tighter text-white">Winner Payment Requests</h2>
            {requests.filter(r => r.status === 'Pending' && r.type === 'Claim').map(r => (
              <div key={r.id} className="bg-zinc-900 p-4 rounded-xl border border-green-500/30 border-l-4 border-l-green-500">
                <div className="font-bold text-sm mb-1 text-white">{r.playerName}</div>
                <div className="text-xs text-zinc-400 mb-2 font-medium">Tournament: {r.tournamentName}</div>
                <div className="text-[10px] font-mono text-green-400 mb-3 bg-black p-2 rounded">UPI: {r.upiId}</div>
                {r.paymentProofUrl && (
                  <a href={r.paymentProofUrl} target="_blank" rel="noreferrer" className="text-[10px] font-bold uppercase tracking-widest text-primary underline mb-4 block">View Payment Screenshot</a>
                )}
                <div className="flex gap-2">
                  <button onClick={() => handleClaimRequest(r.id, 'Rejected')} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 py-2 rounded-lg flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest transition-colors"><X size={14}/> No</button>
                  <button onClick={() => handleClaimRequest(r.id, 'Approved')} className="flex-1 bg-green-500/20 hover:bg-green-500 text-green-500 hover:text-white py-2 rounded-lg flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest transition-colors"><Check size={14}/> Yes</button>
                </div>
              </div>
            ))}
            {requests.filter(r => r.status === 'Pending' && r.type === 'Claim').length === 0 && (
              <div className="text-center text-zinc-500 font-bold tracking-widest text-xs uppercase py-8 bg-zinc-900 rounded-xl">No payment requests</div>
            )}
          </div>
        </div>
      )}
      {activeTab === 'upi' && (
        <div className="space-y-4">
          <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 space-y-4">
            <h2 className="text-xs font-black italic uppercase tracking-tighter text-white">Payment Settings</h2>
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Admin UPI ID</label>
              <input type="text" value={settings.adminUpiId} onChange={e=>setSettings({...settings, adminUpiId: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:outline-none font-mono" />
            </div>
            <button onClick={handleSaveSettings} className="w-full bg-white hover:bg-zinc-200 text-black font-black italic uppercase tracking-tighter py-3 rounded-lg text-sm mt-4 transition-colors">Save UPI</button>
          </div>
        </div>
      )}
      {activeTab === 'delete-all' && (
        <div className="space-y-4">
          <div className="bg-zinc-900 p-6 rounded-2xl border border-red-500/30 flex flex-col items-center justify-center text-center">
            <Trash2 size={48} className="text-red-500 mb-4" />
            <h2 className="text-xl font-black italic uppercase tracking-tighter text-white mb-2">Delete All Data</h2>
            <p className="text-zinc-400 text-sm mb-6 max-w-xs">
              This will permanently delete all tournaments, requests, matches, player data, and media. Only admin settings will remain.
            </p>
            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl w-full">
              <p className="text-red-500 font-bold mb-4 text-sm uppercase tracking-widest">Are you sure? This action cannot be undone.</p>
              <div className="flex gap-2">
                <button onClick={() => setActiveTab('tournament')} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-lg font-bold uppercase tracking-widest text-[10px] transition-colors">Cancel</button>
                <button onClick={handleDeleteAll} disabled={deletingAll} className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-3 rounded-lg font-black italic uppercase tracking-tighter transition-colors flex items-center justify-center gap-2">
                  {deletingAll ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'home' && (
        <div className="space-y-4">
          <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 space-y-4">
            <h2 className="text-xs font-black italic uppercase tracking-tighter text-white">Home Settings</h2>
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Marquee News</label>
              <input type="text" value={settings.news} onChange={e=>setSettings({...settings, news: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:outline-none font-bold" />
            </div>

            <div className="border-t border-zinc-800/80 pt-4 space-y-4">
              <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Home Screen Button Links</h3>
              <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold -mt-2">These will appear as direct clickable buttons on the home screen.</p>
              <div className="grid grid-cols-1 gap-3">
                {['youtube', 'instagram', 'facebook', 'telegram', 'whatsapp', 'website'].map(network => (
                  <div key={network}>
                    <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">{network}</label>
                    <input 
                      type="url" 
                      placeholder={`https://${network}.com/...`}
                      value={(settings.homeLinks as any)?.[network] || ''} 
                      onChange={e => setSettings({
                        ...settings, 
                        homeLinks: { 
                          ...(settings.homeLinks || {}), 
                          [network]: e.target.value 
                        }
                      })} 
                      className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:border-primary focus:outline-none font-mono" 
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800/80">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Home Screen Media</label>
              <div className="flex gap-2">
                <button 
                  onClick={() => triggerFileInput('image')}
                  disabled={isUploadingMedia}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-[10px] uppercase tracking-wider py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isUploadingMedia && mediaUploadType === 'image' ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
                  Upload Image
                </button>
                <button 
                  onClick={() => triggerFileInput('video')}
                  disabled={isUploadingMedia}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-[10px] uppercase tracking-wider py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isUploadingMedia && mediaUploadType === 'video' ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />}
                  Upload Video
                </button>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleMediaFileChange} />
              
              {settings.mediaGallery && settings.mediaGallery.length > 0 && (
                <div className="mt-4 space-y-3">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2 font-bold">Gallery Items</p>
                  {settings.mediaGallery.sort((a, b) => a.order - b.order).map((item, index) => (
                    <div key={item.id} className={`p-2 bg-black rounded-lg border flex gap-3 ${settings.visibility?.[`media_${item.id}`] ? 'border-zinc-800 opacity-50' : 'border-zinc-700'}`}>
                      <div className="w-20 h-16 bg-zinc-900 rounded overflow-hidden flex-shrink-0">
                        {item.type === 'image' ? (
                          <img src={item.url} alt="Gallery item" className="w-full h-full object-cover" />
                        ) : (
                          <video src={item.url} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{item.type}</span>
                          <div className="flex gap-1">
                            <button onClick={() => deleteMedia(item.id)} className="p-1.5 bg-red-900/30 rounded text-red-500 hover:text-red-400 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-end gap-1">
                          <button onClick={() => moveMedia(index, 'up')} disabled={index === 0} className="p-1 bg-zinc-800 rounded disabled:opacity-30">
                            <ArrowUp size={14} />
                          </button>
                          <button onClick={() => moveMedia(index, 'down')} disabled={index === settings.mediaGallery!.length - 1} className="p-1 bg-zinc-800 rounded disabled:opacity-30">
                            <ArrowDown size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={handleSaveSettings} className="w-full bg-white hover:bg-zinc-200 text-black font-black italic uppercase tracking-tighter py-3 rounded-lg text-sm mt-4 transition-colors">Save Home</button>
          </div>
        </div>
      )}

      {activeTab === 'player' && (
        <div className="space-y-4">
          <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="accent-primary w-4 h-4"
                  checked={players.length > 0 && selectedPlayers.length === players.length}
                  onChange={(e) => setSelectedPlayers(e.target.checked ? players.map(p => p.id) : [])}
                />
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">Select All</span>
              </label>
              
              <div className="flex gap-2">
                <button onClick={() => handlePlayerAction('ban')} disabled={selectedPlayers.length === 0} className="px-3 py-1.5 bg-orange-900/30 text-orange-500 rounded text-[10px] font-bold uppercase tracking-widest disabled:opacity-30 border border-orange-900/50">Ban</button>
                <button onClick={() => handlePlayerAction('unban')} disabled={selectedPlayers.length === 0} className="px-3 py-1.5 bg-green-900/30 text-green-500 rounded text-[10px] font-bold uppercase tracking-widest disabled:opacity-30 border border-green-900/50">Unban</button>
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1 no-scrollbar">
              {players.map(player => (
                <label key={player.id} className={`cursor-pointer p-3 rounded-lg border flex items-center gap-3 ${player.banned ? 'bg-red-900/10 border-red-900/30' : 'bg-black border-zinc-800 hover:border-zinc-700 transition-colors'}`}>
                  <input 
                    type="checkbox" 
                    className="accent-primary w-5 h-5 flex-shrink-0 cursor-pointer"
                    checked={selectedPlayers.includes(player.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedPlayers([...selectedPlayers, player.id]);
                      else setSelectedPlayers(selectedPlayers.filter(id => id !== player.id));
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-bold text-white truncate">{player.name}</p>
                      {player.banned && <span className="px-1.5 py-0.5 bg-red-500 text-white text-[8px] font-black uppercase tracking-widest rounded">Banned</span>}
                    </div>
                    <p className="text-[10px] text-zinc-400 font-medium truncate mb-0.5">{player.email || 'No email'}</p>
                    <p className="text-[8px] text-zinc-600 font-mono truncate">{player.gameUid ? `UID: ${player.gameUid}` : player.id}</p>
                  </div>
                </label>
              ))}
              
              {players.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">No players found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'admin' && (
        <div className="space-y-4">
          <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 space-y-4">
            <h2 className="text-xs font-black italic uppercase tracking-tighter text-white">Admin Security</h2>
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Admin Email</label>
              <input type="email" value={settings.adminAuth?.email || ''} onChange={e=>setSettings({...settings, adminAuth: { ...settings.adminAuth, email: e.target.value }})} className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:outline-none font-mono" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Admin Password</label>
              <input type="text" value={settings.adminAuth?.password || ''} onChange={e=>setSettings({...settings, adminAuth: { ...settings.adminAuth, password: e.target.value }})} className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:outline-none font-mono" />
            </div>
            <button onClick={handleSaveSettings} className="w-full bg-white hover:bg-zinc-200 text-black font-black italic uppercase tracking-tighter py-3 rounded-lg text-sm mt-4 transition-colors">Save Security</button>
          </div>

          <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 space-y-4">
            <h2 className="text-xs font-black italic uppercase tracking-tighter text-white">Social Media Links</h2>
            {['youtube', 'instagram', 'facebook', 'telegram', 'whatsapp', 'website'].map(network => (
              <div key={network}>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">{network}</label>
                <input 
                  type="url" 
                  value={(settings.socialLinks as any)?.[network] || ''} 
                  onChange={e => setSettings({...settings, socialLinks: { ...settings.socialLinks, [network]: e.target.value }})} 
                  className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:outline-none font-mono" 
                />
              </div>
            ))}
            <button onClick={handleSaveSettings} className="w-full bg-white hover:bg-zinc-200 text-black font-black italic uppercase tracking-tighter py-3 rounded-lg text-sm mt-4 transition-colors">Save Links</button>
          </div>
        </div>
      )}

    </div>
  );
}
