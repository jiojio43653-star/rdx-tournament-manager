import { NavLink } from 'react-router-dom';
import { Home, Trophy, ShieldCheck } from 'lucide-react';

export function Navigation() {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-white/5 z-50">
      <div className="flex justify-around items-center h-14 max-w-md mx-auto px-2">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-full h-full gap-1 ${
              isActive ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive ? <div className="w-1 h-1 bg-primary rounded-full"></div> : <Home size={18} />}
              <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
            </>
          )}
        </NavLink>
        <NavLink
          to="/tournaments"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-full h-full gap-1 ${
              isActive ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive ? <div className="w-1 h-1 bg-primary rounded-full"></div> : <Trophy size={18} />}
              <span className="text-[10px] font-bold uppercase tracking-wider">Tournament</span>
            </>
          )}
        </NavLink>
        <NavLink
          to="/admin"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-full h-full gap-1 ${
              isActive ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive ? <div className="w-1 h-1 bg-primary rounded-full"></div> : <ShieldCheck size={18} />}
              <span className="text-[10px] font-bold uppercase tracking-wider">Admin</span>
            </>
          )}
        </NavLink>
      </div>
    </div>
  );
}
