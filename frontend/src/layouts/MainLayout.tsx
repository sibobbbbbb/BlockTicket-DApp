import type { ReactNode } from 'react';
import Navbar from '../components/Navbar';
import OracleFeed from '../components/OracleFeed';

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <OracleFeed />
      <footer className="text-center py-6 text-slate-600 text-sm">
        © 2025 Blockchain - IF4035
      </footer>
    </div>
  );
}