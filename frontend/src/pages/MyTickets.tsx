import { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { Ticket, QrCode, Calendar, MapPin } from 'lucide-react';
import SkeletonCard from '../components/SkeletonCard';

// Interface for owned tickets
interface OwnedTicket {
  tokenId: number;
  eventName: string;
  eventDate: string;
  location: string;
  imageCID: string;
}

// Mock Data: User's owned tickets
const MOCK_OWNED_TICKETS: OwnedTicket[] = [
  {
    tokenId: 101,
    eventName: "Coldplay: Music of the Spheres",
    eventDate: "15 Nov 2025",
    location: "GBK Stadium, Jakarta",
    imageCID: "QmHash..."
  },
  {
    tokenId: 205,
    eventName: "Tech Conference 2025",
    eventDate: "20 Dec 2025",
    location: "Sabuga, Bandung",
    imageCID: "QmHash..."
  }
];

export default function MyTickets() {
  const { isConnected, account } = useWeb3();
  const [isLoading, setIsLoading] = useState(false);
  const [tickets, setTickets] = useState<OwnedTicket[]>([]);

  useEffect(() => {
    if (isConnected && account) {
      setIsLoading(true);

      // TODO: Fetch tickets from blockchain
      setTimeout(() => {
        setTickets(MOCK_OWNED_TICKETS);
        setIsLoading(false);
      }, 1500);
    } else {
      setTickets([]);
    }
  }, [isConnected, account]);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <div className="bg-slate-800 p-6 rounded-full">
            <Ticket size={48} className="text-slate-500" />
        </div>
        <h2 className="text-2xl font-bold text-white">Wallet Disconnected</h2>
        <p className="text-slate-400 max-w-md">
          Connect your MetaMask to view your collection of NFT tickets.
        </p>
      </div>
    );
  }

  return (
    <section className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Ticket className="text-cyan-400" size={32} />
        <h1 className="text-3xl font-bold text-white">My Collections</h1>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {isLoading ? (
          [1, 2].map((n) => <SkeletonCard key={n} />)
        ) : tickets.length > 0 ? (
          tickets.map((ticket) => (
            <div key={ticket.tokenId} className="relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-xl hover:shadow-cyan-900/20 transition group">

              <div className="h-40 bg-slate-800 w-full relative">
                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-mono text-cyan-400 border border-cyan-500/30">
                  ID: #{ticket.tokenId}
                </div>
                <div className="w-full h-full flex items-center justify-center text-slate-600">
                    [Poster Image Placeholder]
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between relative">
                <div className="absolute -top-3 left-0 w-full h-6 flex justify-between px-4">
                </div>

                <div>
                    <h2 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition">
                        {ticket.eventName}
                    </h2>

                    <div className="space-y-2 text-sm text-slate-400 mb-6">
                        <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-cyan-600" />
                            <span>{ticket.eventDate}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-cyan-600" />
                            <span>{ticket.location}</span>
                        </div>
                    </div>
                </div>

                {/* QR Code Section */}
                <div className="mt-4 pt-4 border-t border-slate-800 border-dashed flex items-center justify-between">
                    <div className="text-xs text-slate-500">
                        <p>Scan at venue</p>
                        <p className="font-mono text-slate-300">VALID</p>
                    </div>
                    <div className="bg-white p-1 rounded">
                        <QrCode size={48} className="text-black" />
                    </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-800 rounded-xl">
             <p className="text-slate-500 mb-4">You don't own any tickets yet.</p>
             <button className="text-cyan-400 hover:text-cyan-300 underline font-semibold">
                Buy Tickets Now
             </button>
          </div>
        )}

      </div>
    </section>
  );
}