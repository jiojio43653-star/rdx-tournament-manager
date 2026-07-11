import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Tournament, JoinRequest } from '../types';
import { Link } from 'react-router-dom';
import { Gamepad2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../store/AuthContext';

export default function Tournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [userRequests, setUserRequests] = useState<Record<string, boolean>>({});
  const { user } = useAuth();

  useEffect(() => {
    const q = query(collection(db, 'tournaments'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tData: Tournament[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Tournament;
        tData.push({ id: doc.id, ...data });
      });
      setTournaments(tData);
    }, (error) => {
      console.error("Error fetching tournaments:", error);
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

    return () => {
      unsubscribe();
      unsubRequests();
    };
  }, [user]);

  return (
    <div className="max-w-md mx-auto min-h-screen pb-8 bg-black flex flex-col">
      <div className="pt-12 px-4 pb-4 sticky top-0 z-50 bg-black/95 backdrop-blur-sm border-b border-white/5 mb-4">
        <h1 className="text-[28px] font-black italic tracking-tighter text-white uppercase">Tournaments</h1>
        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Join and Compete</p>
      </div>

      <div className="px-6 flex-1">
        <div className="space-y-4">
          {tournaments.map((tournament) => (
            <Link to={`/tournament/${tournament.id}`} key={tournament.id} className="block group">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden group-hover:border-zinc-700 transition-colors flex flex-col relative shadow-xl">
                <div className="w-full h-36 bg-zinc-800 relative">
                  <img src={tournament.imageUrl} alt={tournament.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end">
                    <div>
                      <p className="text-lg font-black italic uppercase text-white leading-tight drop-shadow-md">{tournament.name}</p>
                      <p className="text-[10px] text-zinc-300 font-bold uppercase tracking-widest mt-0.5 drop-shadow-md">
                        {tournament.gameName || 'Free Fire'} {tournament.category === 'CS' ? '(CS)' : ''}
                      </p>
                    </div>
                    {tournament.status === 'Live' && (
                      <div className="px-2 py-1 bg-red-500 rounded text-[10px] font-black uppercase tracking-widest text-white shadow-lg animate-pulse mb-1">
                        Live
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="p-4 pt-3">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-4">
                      <div>
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-0.5">Entry</p>
                        <p className="text-sm font-bold text-white font-mono">{tournament.isFree ? <span className="text-green-400 font-sans italic tracking-tighter">FREE</span> : `₹${tournament.entryFee}`}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-0.5">Prize Pool</p>
                        <p className="text-sm font-bold text-white font-mono">₹{tournament.prizePool}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-0.5">Slots</p>
                        <p className="text-sm font-bold text-white font-mono">{tournament.joinedCount}/{tournament.totalSlots}</p>
                      </div>
                    </div>
                    {(!userRequests[tournament.id] && tournament.joinedCount >= tournament.totalSlots) ? null : (
                      <button className={`px-4 py-2 text-[10px] font-black italic uppercase tracking-tighter rounded-lg transition-colors ${userRequests[tournament.id] ? 'bg-zinc-800 text-zinc-400' : 'bg-white text-black hover:bg-zinc-200'}`}>
                        {userRequests[tournament.id] ? 'Joined' : 'Join'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}

          {tournaments.length === 0 && (
            <div className="text-center py-12 text-zinc-600">
              <Gamepad2 size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-xs uppercase font-bold tracking-widest">No upcoming tournaments.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
