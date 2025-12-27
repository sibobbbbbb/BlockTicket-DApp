import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import {
  Ticket,
  Wallet,
  ShieldCheck,
  ShieldAlert,
  LayoutDashboard,
  Scan,
  Menu,
  X,
  ShoppingBag,
} from "lucide-react";
import KycModal from "./KycModal";

export default function Navbar() {
  const { isConnected, connectWallet, account, balance, kycStatus } = useWeb3();
  const location = useLocation();
  const [isKycOpen, setIsKycOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const shortAddr = account
    ? `${account.slice(0, 6)}...${account.slice(-4)}`
    : "";

  const isActive = (path: string) =>
    location.pathname === path
      ? "text-cyan-400 font-bold"
      : "text-slate-400 hover:text-white";

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* LOGO */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="bg-linear-to-tr from-cyan-500 to-blue-600 p-2 rounded-lg group-hover:scale-110 transition">
                <Ticket className="text-white" size={24} />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-white to-slate-400">
                BlockTicket
              </span>
            </Link>

            {/* DESKTOP MENU */}
            <div className="hidden md:flex items-center gap-8">
              <Link
                to="/"
                className={`text-sm transition flex items-center gap-2 ${isActive(
                  "/"
                )}`}
              >
                Events
              </Link>

              {isConnected && (
                <>
                  <Link
                    to="/my-tickets"
                    className={`text-sm transition flex items-center gap-2 ${isActive(
                      "/my-tickets"
                    )}`}
                  >
                    My Tickets
                  </Link>
                  <Link
                    to="/resale"
                    className={`text-sm transition flex items-center gap-2 ${isActive(
                      "/resale"
                    )}`}
                  >
                    <ShoppingBag size={16} /> Market
                  </Link>
                  <Link
                    to="/admin"
                    className={`text-sm transition flex items-center gap-2 ${isActive(
                      "/admin"
                    )}`}
                  >
                    <LayoutDashboard size={16} /> Admin
                  </Link>
                  <Link
                    to="/scanner"
                    className={`text-sm transition flex items-center gap-2 ${isActive(
                      "/scanner"
                    )}`}
                  >
                    <Scan size={16} /> Scanner
                  </Link>
                </>
              )}
            </div>

            {/* RIGHT SIDE (WALLET & KYC) */}
            <div className="flex items-center gap-4">
              {isConnected ? (
                <div className="flex items-center gap-3">
                  {/* KYC STATUS BADGE */}
                  {kycStatus?.isVerified ? (
                    <div
                      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-xs font-bold cursor-default shadow-[0_0_10px_rgba(34,197,94,0.2)]"
                      title="KYC Verified. You can purchase tickets."
                    >
                      <ShieldCheck size={14} />
                      <span>VERIFIED</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsKycOpen(true)}
                      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full text-red-400 text-xs font-bold hover:bg-red-500/20 transition animate-pulse cursor-pointer shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                      title="Click to verify your identity"
                    >
                      <ShieldAlert size={14} />
                      <span>UNVERIFIED</span>
                    </button>
                  )}

                  {/* BALANCE */}
                  <div className="hidden lg:flex flex-col items-end text-xs mr-2">
                    <span className="text-slate-400">Balance</span>
                    <span className="text-white font-mono">
                      {parseFloat(balance).toFixed(4)} ETH
                    </span>
                  </div>

                  {/* WALLET ADDRESS */}
                  <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-full pl-3 pr-1 py-1">
                    <span className="text-xs font-mono text-slate-300 hidden sm:block">
                      {shortAddr}
                    </span>
                    <div className="w-8 h-8 bg-linear-to-r from-cyan-600 to-blue-600 rounded-full flex items-center justify-center">
                      <Wallet size={16} className="text-white" />
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={connectWallet}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold py-2 px-6 rounded-full transition shadow-lg shadow-cyan-500/20"
                >
                  Connect Wallet
                </button>
              )}

              {/* MOBILE MENU TOGGLE */}
              <button
                className="md:hidden text-slate-300 hover:text-white"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>

        {/* MOBILE DROPDOWN */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-slate-950 border-b border-slate-800 p-4 space-y-4">
            <Link to="/" className="block text-slate-300 py-2">
              Events
            </Link>
            {isConnected && (
              <>
                <Link to="/my-tickets" className="block text-slate-300 py-2">
                  My Tickets
                </Link>
                <Link to="/admin" className="block text-slate-300 py-2">
                  Admin Dashboard
                </Link>

                {/* Mobile KYC Button */}
                {!kycStatus?.isVerified && (
                  <button
                    onClick={() => {
                      setIsKycOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full mt-2 flex items-center justify-center gap-2 bg-red-500/10 text-red-400 py-2 rounded-lg text-sm font-bold border border-red-500/20"
                  >
                    <ShieldAlert size={16} /> Verify Identity Now
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </nav>

      {/* MODAL RENDER */}
      <KycModal isOpen={isKycOpen} onClose={() => setIsKycOpen(false)} />
    </>
  );
}
