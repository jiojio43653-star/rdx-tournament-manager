import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, addDoc, onSnapshot, updateDoc, increment, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Tournament, JoinRequest, AppSettings, RoomDetails } from '../types';
import { useAuth } from '../store/AuthContext';
import { uploadToCloudinary } from '../lib/utils';
import { ArrowLeft, Upload, Clock, Users, Trophy, IndianRupee, Copy, CheckCircle2 } from 'lucide-react';

export default function TournamentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [request, setRequest] = useState<JoinRequest | null>(null);
  const [claimRequest, setClaimRequest] = useState<JoinRequest | null>(null);
  const [room, setRoom] = useState<RoomDetails | null>(null);
  
  const [proof, setProof] = useState<File | null>(null);
  const [claimProof, setClaimProof] = useState<File | null>(null);
  const [upiId, setUpiId] = useState('');
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [winnerProfile, setWinnerProfile] = useState<any>(null);

  useEffect(() => {
    if (tournament?.winnerId) {
      getDoc(doc(db, 'players', tournament.winnerId)).then((docSnap) => {
        if (docSnap.exists()) {
          setWinnerProfile(docSnap.data());
        }
      });
    }
  }, [tournament?.winnerId]);

  useEffect(() => {
    const fetchData = () => {
      if (!id) return;
      try {
        // Fetch Tournament (Realtime)
        const unsubT = onSnapshot(doc(db, 'tournaments', id), (doc) => {
          if (doc.exists()) {
            setTournament({ id: doc.id, ...doc.data() } as Tournament);
          }
        });

        // Fetch Settings (for UPI and UI)
        const unsubS = onSnapshot(doc(db, 'settings', 'app'), (snapshot) => {
          if (snapshot.exists()) setSettings(snapshot.data() as AppSettings);
        });

        let unsubR = () => {};
        let unsubClaim = () => {};
        let unsubRoom = () => {};

        if (user) {
          // Fetch Existing Requests (Realtime)
          const q = query(collection(db, 'requests'), where('tournamentId', '==', id), where('playerId', '==', user.uid));
          unsubR = onSnapshot(q, (snap) => {
            let joinReq: JoinRequest | null = null;
            let claimReq: JoinRequest | null = null;

            snap.docs.forEach(d => {
              const data = d.data() as JoinRequest;
              const reqData = { id: d.id, ...data };
              if (data.type === 'Claim') {
                claimReq = reqData;
              } else {
                // If type is 'Join' or undefined (legacy), it's a join request
                joinReq = reqData;
              }
            });

            setRequest(joinReq);
            setClaimRequest(claimReq);
          });

          // If approved, fetch Room details (Realtime)
          unsubRoom = onSnapshot(doc(db, 'rooms', id), (doc) => {
             if(doc.exists()) setRoom(doc.data() as RoomDetails);
          });
        }
        
        setLoading(false);
        
        return () => {
          unsubT();
          unsubS();
          unsubR();
          unsubClaim();
          unsubRoom();
        };
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    };
    return fetchData();
  }, [id, user]);

  const handleJoin = async () => {
    if (!profile) {
      alert("Please complete your profile first.");
      navigate('/profile');
      return;
    }
    const actuallyFree = tournament?.isFree || Number(tournament?.entryFee) === 0;
    if ((!actuallyFree && !proof) || !tournament || !user) return;

    setJoining(true);
    try {
      let proofUrl = '';
      if (!actuallyFree && proof) {
        proofUrl = await uploadToCloudinary(proof, 'image');
      }

      const newReq: Omit<JoinRequest, 'id'> = {
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        playerId: user.uid,
        playerName: profile.name,
        paymentProofUrl: proofUrl,
        status: actuallyFree ? 'Approved' : 'Pending', // Auto-approve free matches
        createdAt: Date.now(),
        type: 'Join'
      };
      
      const docRef = await addDoc(collection(db, 'requests'), newReq);
      
      await updateDoc(doc(db, 'tournaments', tournament.id), {
        joinedCount: increment(1)
      });
      
      setRequest({ id: docRef.id, ...newReq });
    } catch (e) {
      console.error(e);
      alert("Error submitting request.");
    } finally {
      setJoining(false);
    }
  };

  const handleClaim = async () => {
    if (!profile || !user || !tournament || !claimProof || !upiId) return;
    setClaiming(true);
    try {
      const proofUrl = await uploadToCloudinary(claimProof, 'image');

      const newReq: Omit<JoinRequest, 'id'> = {
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        playerId: user.uid,
        playerName: profile.name,
        paymentProofUrl: proofUrl,
        upiId: upiId,
        status: 'Pending',
        createdAt: Date.now(),
        type: 'Claim'
      };
      
      await addDoc(collection(db, 'requests'), newReq);
    } catch (e) {
      console.error(e);
      alert("Error submitting claim.");
    } finally {
      setClaiming(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-zinc-500 font-bold tracking-widest text-xs uppercase">Loading...</div>;
  if (!tournament || settings?.visibility?.[`tournament_${tournament.id}`]) return <div className="text-center py-20 text-zinc-500 font-bold tracking-widest text-xs uppercase">Tournament not found</div>;

  const isActuallyFree = tournament.isFree || Number(tournament.entryFee) === 0;
  const hasPrizeSystem = !isActuallyFree && Number(tournament.prizePool) > 0;

  return (
    <div className="max-w-md mx-auto min-h-screen pb-20 bg-black flex flex-col">
      {/* Header */}
      <div className="relative h-64 border-b border-white/5">
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 z-10 w-10 h-10 bg-black/80 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 hover:border-primary/50 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <img src={tournament.imageUrl} alt={tournament.name} className="w-full h-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-primary px-2 py-0.5 text-[10px] font-black uppercase rounded w-max mb-2 text-white">{tournament.matchType} • {tournament.gameName}</div>
          <h1 className="text-2xl font-black italic tracking-tighter text-white">{tournament.name}</h1>
        </div>
      </div>

      <div className="px-4 mt-4 flex flex-col">
        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
            <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><IndianRupee size={12}/> Entry Fee</div>
            <div className="font-bold text-lg text-white font-mono">{isActuallyFree ? <span className="text-green-400 font-sans italic tracking-tighter">FREE</span> : `₹${tournament.entryFee}`}</div>
          </div>
          <div className="bg-zinc-900 border border-primary/20 rounded-xl p-3">
            <div className="text-primary text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><Trophy size={12}/> Prize Pool</div>
            <div className="font-bold text-lg text-primary font-mono">₹{tournament.prizePool}</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
            <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><Users size={12}/> Slots</div>
            <div className="font-bold text-sm text-white font-mono">{tournament.joinedCount} / {tournament.totalSlots}</div>
          </div>
          {tournament.status === 'Live' && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center justify-center">
              <span className="text-red-500 font-black italic uppercase tracking-tighter animate-pulse">LIVE NOW</span>
            </div>
          )}
        </div>

        {/* Status Section */}
        <div className="mb-6 space-y-4">
          {tournament.winnerId ? (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-6 text-center">
              <Trophy size={48} className="text-orange-500 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(249,115,22,0.5)]" />
              <h3 className="text-[10px] font-bold text-orange-500/70 uppercase tracking-widest mb-1">Tournament Winner</h3>
              <p className="text-white text-3xl font-black italic tracking-tighter uppercase mb-2">{tournament.winnerName}</p>
              {winnerProfile?.gameUid && (
                <div className="inline-block bg-black px-4 py-2 rounded-lg border border-orange-500/20">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mr-2">UID</span>
                  <span className="font-mono text-white text-sm">{winnerProfile.gameUid}</span>
                </div>
              )}
            </div>
          ) : request?.status === 'Approved' ? (
            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4">
              <h3 className="font-black italic tracking-tighter text-green-500 flex items-center gap-2 mb-4 uppercase"><CheckCircle2 size={18} /> Request Approved</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] font-bold text-green-500/70 uppercase tracking-widest">Room ID</div>
                  <div className="font-mono text-lg text-white bg-black p-2 rounded-lg mt-1 select-all border border-green-500/10">{tournament.roomId || room?.roomId || 'Waiting For Room Details'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-green-500/70 uppercase tracking-widest">Password</div>
                  <div className="font-mono text-lg text-white bg-black p-2 rounded-lg mt-1 select-all border border-green-500/10">{tournament.roomPassword || room?.roomPassword || 'Waiting For Room Details'}</div>
                </div>
                {room?.matchInstructions && (
                  <div className="text-xs font-medium text-green-500/80 bg-green-500/5 p-3 rounded-lg border border-green-500/10">
                    {room.matchInstructions}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {request?.status === 'Pending' && !tournament.winnerId && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
              <Clock size={32} className="text-yellow-500 mx-auto mb-3" />
              <h3 className="font-black italic uppercase tracking-tighter text-white mb-1">Request Pending</h3>
              <p className="text-zinc-400 text-xs font-medium">Your payment proof is being verified. Please check back later.</p>
            </div>
          )}

          {request?.status === 'Rejected' && !tournament.winnerId && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
              <h3 className="font-black italic uppercase tracking-tighter text-red-500 mb-1">Request Rejected</h3>
              <p className="text-zinc-400 text-xs font-medium">Your join request was declined.</p>
            </div>
          )}
        </div>

        {/* Join Section */}
        {!request && !tournament.winnerId && tournament.joinedCount < tournament.totalSlots && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6">
            <h3 className="text-xs font-black italic uppercase tracking-tighter text-white mb-4 border-b border-white/5 pb-3">Join Match</h3>
            
            {isActuallyFree ? (
              <div className="bg-black p-4 rounded-xl mb-4 text-center border border-green-500/20">
                <div className="text-green-500 font-black italic tracking-tighter uppercase text-xl">FREE ENTRY</div>
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">No payment required</div>
              </div>
            ) : (
              <>
                <div className="bg-black p-4 rounded-xl mb-4 text-center border border-white/5">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Pay via UPI</div>
                  <div className="font-mono text-lg text-white flex justify-center items-center gap-2">
                    {settings?.adminUpiId || 'admin@upi'}
                    <button className="text-zinc-500 hover:text-white"><Copy size={16}/></button>
                  </div>
                  <div className="text-primary font-bold mt-2 text-sm font-mono">Amount: ₹{tournament.entryFee}</div>
                </div>

                <div className="mb-4">
                  <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Upload Payment Screenshot</label>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-zinc-800 border-dashed rounded-xl cursor-pointer hover:bg-zinc-800/50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {proof ? (
                        <span className="text-xs text-primary font-bold">{proof.name}</span>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 mb-2 text-zinc-600" />
                          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Click to upload</p>
                        </>
                      )}
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => setProof(e.target.files?.[0] || null)} />
                  </label>
                </div>
              </>
            )}

            <button 
              onClick={handleJoin}
              disabled={(!isActuallyFree && !proof) || joining || tournament.joinedCount >= tournament.totalSlots}
              className="w-full bg-primary hover:bg-orange-500 disabled:opacity-50 text-white font-black italic uppercase tracking-tighter py-4 rounded-xl transition-colors"
            >
              {tournament.joinedCount >= tournament.totalSlots ? 'Tournament Full' : joining ? 'Submitting...' : (isActuallyFree ? 'Join Now' : 'Submit Request')}
            </button>
          </div>
        )}

        {/* Winner Section */}
        {request?.status === 'Approved' && tournament.winnerId === user?.uid && hasPrizeSystem && (
          <div className="bg-zinc-900 border border-green-500/30 rounded-2xl p-5 mb-6">
            <h3 className="text-xs font-black italic uppercase tracking-tighter text-green-500 mb-4 flex items-center gap-2"><Trophy size={16}/> You are the Winner!</h3>
            
            {claimRequest?.status === 'Approved' ? (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
                <h3 className="font-black italic uppercase tracking-tighter text-green-500 mb-1">Payment Received Successfully</h3>
                <p className="text-zinc-400 text-xs font-medium">Your prize money has been sent.</p>
              </div>
            ) : claimRequest?.status === 'Rejected' ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                <h3 className="font-black italic uppercase tracking-tighter text-red-500 mb-1">Payment Request Rejected</h3>
                <p className="text-zinc-400 text-xs font-medium">Your claim request was declined.</p>
              </div>
            ) : claimRequest?.status === 'Pending' ? (
              <div className="bg-black border border-white/5 rounded-xl p-4 text-center">
                <Clock size={24} className="text-yellow-500 mx-auto mb-2" />
                <h3 className="font-black italic uppercase tracking-tighter text-white mb-1">Claim Pending</h3>
                <p className="text-zinc-400 text-xs font-medium">Your request is being reviewed by the admin.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Your UPI ID</label>
                  <input type="text" value={upiId} onChange={e=>setUpiId(e.target.value)} placeholder="e.g. 9876543210@upi" className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-3 text-sm text-white focus:border-green-500 focus:outline-none transition-colors font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Upload Profile/Stats Screenshot</label>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-zinc-800 border-dashed rounded-xl cursor-pointer hover:bg-zinc-800/50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {claimProof ? (
                        <span className="text-xs text-green-500 font-bold">{claimProof.name}</span>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 mb-2 text-zinc-600" />
                          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Click to upload</p>
                        </>
                      )}
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => setClaimProof(e.target.files?.[0] || null)} />
                  </label>
                </div>
                <button 
                  onClick={handleClaim}
                  disabled={!upiId || !claimProof || claiming}
                  className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-black italic uppercase tracking-tighter py-4 rounded-xl transition-colors"
                >
                  {claiming ? 'Submitting...' : 'Claim Prize'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Rules */}
        <div className="pb-8">
           <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Rules</h3>
           <p className="text-xs font-medium text-zinc-400 leading-relaxed whitespace-pre-wrap">{tournament.rules}</p>
        </div>

      </div>
    </div>
  );
}
