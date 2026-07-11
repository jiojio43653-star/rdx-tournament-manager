import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './store/AuthContext';
import { Navigation } from './components/Navigation';
import Home from './pages/Home';
import Tournaments from './pages/Tournaments';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import AdminDashboard from './pages/AdminDashboard';
import TournamentDetails from './pages/TournamentDetails';

const AppContent = () => {
  const { profile, logOut } = useAuth();
  
  if (profile?.banned) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-red-500 uppercase tracking-tighter italic mb-2">Account Banned</h1>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">You have been banned from using this application.</p>
        </div>
        <button 
          onClick={logOut}
          className="bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800 font-bold uppercase tracking-widest text-xs px-6 py-3 rounded-lg transition-colors"
        >
          Log Out
        </button>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen pb-16 bg-black text-white font-sans selection:bg-primary/30">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/tournament/:id" element={<TournamentDetails />} />
        </Routes>
        <Navigation />
      </div>
    </BrowserRouter>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
