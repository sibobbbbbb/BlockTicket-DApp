import { Link } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { Wallet } from 'lucide-react';

export default function Navbar() {
  const { account, connectWallet, isConnected, balance } = useWeb3();

  const shortenAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <nav className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-cyan-400">
             <span className="text-2xl">🎟️</span> BlockTicket
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="hover:text-cyan-300 transition">Events</Link>
            <Link to="/my-tickets" className="hover:text-cyan-300 transition">My Tickets</Link>
            <Link to="/admin" className="hover:text-cyan-300 transition">Admin</Link>
          </div>

          {/* Wallet Button */}
          <div>
            {!isConnected ? (
              <button 
                onClick={connectWallet}
                className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 px-4 py-2 rounded-lg font-medium transition"
              >
                <Wallet size={18} /> Connect
              </button>
            ) : (
              <div className="flex items-center gap-3 bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
                <span className="text-sm text-slate-400">{parseFloat(balance).toFixed(4)} ETH</span>
                <span className="bg-slate-700 px-2 py-1 rounded text-xs font-mono text-cyan-300">
                  {shortenAddress(account!)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}