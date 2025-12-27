import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../context/Web3Context";
import { EVENT_REGISTRY_ADDRESS, MARKETPLACE_ADDRESS } from "../contracts/addresses";
import EventRegistryABI from "../contracts/EventRegistryABI.json";
import MarketplaceABI from "../contracts/MarketplaceABI.json";
import { Loader2, Ticket, Calendar, MapPin, ExternalLink, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";
import SkeletonCard from "../components/SkeletonCard";

interface EventData {
  id: number;
  name: string;
  description: string;
  image: string;
  location: string;
  priceEth: string;
  stock: number;
  saleStart: number;
  saleEnd: number;
  eventDate: number;
  organizer: string;
}

export default function Home() {
  const { account, isConnected, kycStatus } = useWeb3();
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<number | null>(null);

  useEffect(() => {
    fetchEvents();
  }, [isConnected]);

  const fetchEvents = async () => {
    if (!window.ethereum) return;
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      const registryContract = new ethers.Contract(EVENT_REGISTRY_ADDRESS, EventRegistryABI, provider);

      const nextId = await registryContract.nextEventId();
      const totalEvents = Number(nextId);

      const loadedEvents: EventData[] = [];

      for (let i = 1; i < totalEvents; i++) {
        const eventData = await registryContract.getFunction("getEvent")(i);
        if (eventData.cancelled) continue;

        let meta : any = { name: "Unknown Event", description: "", image: "", attributes: [] };
        let metadataUri = eventData.metadataURI;

        if (metadataUri && metadataUri.startsWith("ipfs://")) {
            const cid = metadataUri.replace("ipfs://", "");
            const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
            
            try {
                const res = await fetch(gatewayUrl);
                const json = await res.json();
                meta = { ...meta, ...json };
            } catch (err) {
                console.error("Failed to fetch metadata for event", i, err);
            }
        }

        let imageUrl = meta.image || "https://placehold.co/600x400?text=No+Image";
        if (imageUrl.startsWith("ipfs://")) {
            imageUrl = `https://gateway.pinata.cloud/ipfs/${imageUrl.replace("ipfs://", "")}`;
        }

        const stockAttr = meta.attributes?.find((a: any) => a.trait_type === "Stock");
        const locAttr = meta.attributes?.find((a: any) => a.trait_type === "Location");

        loadedEvents.push({
          id: i,
          name: meta.name,
          description: meta.description,
          image: imageUrl,
          location: locAttr ? locAttr.value : "TBA",
          priceEth: ethers.formatEther(eventData.basePriceWei),
          stock: stockAttr ? parseInt(stockAttr.value) : 0,
          saleStart: Number(eventData.saleStart),
          saleEnd: Number(eventData.saleEnd),
          eventDate: Number(eventData.eventDate),
          organizer: eventData.organizer
        });
      }

      setEvents(loadedEvents.reverse());
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to load events from blockchain");
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (event: EventData) => {
    if (!account) return toast.error("Connect wallet first!");
    
    if (!kycStatus?.isVerified) {
        toast.error("You must verify your identity (KYC) first!");
        return;
    }

    const now = Math.floor(Date.now() / 1000);
    if (now < event.saleStart) return toast.error("Sale has not started yet!");
    if (now > event.saleEnd) return toast.error("Sale has ended!");

    setBuyingId(event.id);
    const toastId = toast.loading("Processing purchase...");

    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const marketplaceContract = new ethers.Contract(MARKETPLACE_ADDRESS, MarketplaceABI, signer);

        const qty = 1;
        const priceWei = ethers.parseEther(event.priceEth);
        const totalPay = priceWei * BigInt(qty);

        const tx = await marketplaceContract.buyPrimary(event.id, qty, {
            value: totalPay
        });

        toast.loading("Waiting for transaction...", { id: toastId });
        await tx.wait();

        toast.success("Ticket Purchased Successfully! Check 'My Tickets'.", { id: toastId });
        
    } catch (error: any) {
        console.error(error);
        if (error.reason) {
            toast.error(`Failed: ${error.reason}`, { id: toastId });
        } else if (error.message.includes("exceeds per-person limit")) {
            toast.error("Limit reached! You cannot buy more tickets.", { id: toastId });
        } else {
            toast.error("Purchase failed. Check console.", { id: toastId });
        }
    } finally {
        setBuyingId(null);
    }
  };

  const formatTime = (unix: number) => new Date(unix * 1000).toLocaleDateString("id-ID", { 
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      
      {/* Hero Section */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Discover <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-600">Web3 Events</span>
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Secure, transparent, and scalper-free ticketing. Buy tickets directly from organizers using Ethereum.
        </p>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-slate-800">
            <Ticket className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white">No Events Found</h3>
            <p className="text-slate-400">Be the first to create an event in Admin Dashboard!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.map((event) => (
            <div key={event.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-cyan-500/50 transition duration-300 flex flex-col group shadow-lg">
              
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <img 
                    src={event.image} 
                    alt={event.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                />
                <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold text-white border border-white/10">
                    {event.priceEth} ETH
                </div>
              </div>

              {/* Content */}
              <div className="p-6 flex-1 flex flex-col">
                <div className="mb-4">
                    <h3 className="text-xl font-bold text-white mb-1 line-clamp-1">{event.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                        <MapPin size={14} /> {event.location}
                    </div>
                </div>

                <div className="space-y-3 mb-6 text-sm">
                    <div className="flex justify-between items-center text-slate-300">
                        <span className="flex items-center gap-2"><Calendar size={14} className="text-cyan-500"/> Event Date</span>
                        <span>{formatTime(event.eventDate)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                        <span className="flex items-center gap-2 text-slate-500">Sale Ends</span>
                        <span className="text-slate-500">{formatTime(event.saleEnd)}</span>
                    </div>
                </div>

                {/* Action Button */}
                <div className="mt-auto">
                    {/* KYC Guard UI */}
                    {!kycStatus?.isVerified && isConnected && (
                        <div className="mb-3 flex items-center gap-2 text-xs text-red-400 bg-red-900/20 p-2 rounded-lg border border-red-900/30">
                            <ShieldAlert size={14} /> KYC Required to buy
                        </div>
                    )}

                    <button
                        onClick={() => handleBuy(event)}
                        disabled={buyingId === event.id || (!kycStatus?.isVerified && isConnected)}
                        className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition 
                            ${!kycStatus?.isVerified && isConnected 
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                                : 'bg-white text-slate-900 hover:bg-cyan-500 hover:text-white'
                            }`}
                    >
                        {buyingId === event.id ? (
                            <><Loader2 className="animate-spin" size={18} /> Processing...</>
                        ) : (
                            <>Buy Ticket <ExternalLink size={18} /></>
                        )}
                    </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}