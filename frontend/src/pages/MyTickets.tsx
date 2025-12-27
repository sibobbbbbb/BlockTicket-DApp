import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../context/Web3Context";
import { 
    TICKET_NFT_ADDRESS, 
    MARKETPLACE_ADDRESS, 
    EVENT_REGISTRY_ADDRESS 
} from "../contracts/addresses";
import TicketNFTABI from "../contracts/TicketNFTABI.json";
import MarketplaceABI from "../contracts/MarketplaceABI.json";
import EventRegistryABI from "../contracts/EventRegistryABI.json";
import { Ticket, QrCode, Tag, Loader2, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import QRCode from "react-qr-code";

interface MyTicket {
  tokenId: number;
  eventId: number;
  name: string;
  image: string;
  description: string;
  eventDate: number;
}

export default function MyTickets() {
  const { account, isConnected } = useWeb3();
  const [tickets, setTickets] = useState<MyTicket[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [showQrFor, setShowQrFor] = useState<number | null>(null);
  const [qrData, setQrData] = useState<string>("");
  const [sellId, setSellId] = useState<number | null>(null);
  const [sellPrice, setSellPrice] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isConnected && account) {
      fetchMyTickets();
    }
  }, [isConnected, account]);

  const fetchMyTickets = async () => {
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const ticketContract = new ethers.Contract(TICKET_NFT_ADDRESS, TicketNFTABI, provider);
      const registryContract = new ethers.Contract(EVENT_REGISTRY_ADDRESS, EventRegistryABI, provider);

      const filter = ticketContract.filters.Transfer(null, account);
      const logs = await ticketContract.queryFilter(filter);

      const uniqueTokenIds = new Set<number>();
      logs.forEach((log: any) => {
        uniqueTokenIds.add(Number(log.args[2]));
      });

      const myTickets: MyTicket[] = [];

      for (const tokenId of uniqueTokenIds) {
        try {
            const currentOwner = await ticketContract.ownerOf(tokenId);
            if (currentOwner.toLowerCase() !== account?.toLowerCase()) continue;

            const eventId = await ticketContract.eventIdOf(tokenId);
            const eventData = await registryContract.getFunction("getEvent")(eventId);
            
            let meta = { name: `Event #${eventId}`, image: "", description: "" };
            let metadataUri = eventData.metadataURI;

            if (metadataUri && metadataUri.startsWith("ipfs://")) {
                const cid = metadataUri.replace("ipfs://", "");
                const gateway = `https://gateway.pinata.cloud/ipfs/${cid}`;
                try {
                    const res = await fetch(gateway);
                    const json = await res.json();
                    meta = { ...meta, ...json };
                } catch (e) { console.error("IPFS fetch error", e); }
            }

            let imageUrl = meta.image;
            if (imageUrl && imageUrl.startsWith("ipfs://")) {
                imageUrl = `https://gateway.pinata.cloud/ipfs/${imageUrl.replace("ipfs://", "")}`;
            }

            myTickets.push({
                tokenId,
                eventId: Number(eventId),
                name: meta.name,
                image: imageUrl || "https://placehold.co/400?text=No+Image",
                description: meta.description,
                eventDate: Number(eventData.eventDate)
            });

        } catch (err) {
            console.error(`Error fetching token ${tokenId}`, err);
        }
      }

      setTickets(myTickets.reverse());
    } catch (error) {
      console.error(error);
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  const handleShowQR = async (ticket: MyTicket) => {
    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const timestamp = Math.floor(Date.now() / 1000);
        const message = `CheckIn-${ticket.tokenId}-${ticket.eventId}-${timestamp}`;
        const signature = await signer.signMessage(message);

        const qrJson = JSON.stringify({
            id: ticket.tokenId,
            eid: ticket.eventId,
            owner: account,
            ts: timestamp,
            sig: signature
        });
        setQrData(qrJson);
        setShowQrFor(ticket.tokenId);
    } catch (error) {
        toast.error("Failed to sign QR code");
    }
  };

  const handleListForSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellId || !sellPrice) return;

    try {
        setIsProcessing(true);
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        const ticketContract = new ethers.Contract(TICKET_NFT_ADDRESS, TicketNFTABI, signer);
        const marketplaceContract = new ethers.Contract(MARKETPLACE_ADDRESS, MarketplaceABI, signer);
        const registryContract = new ethers.Contract(EVENT_REGISTRY_ADDRESS, EventRegistryABI, signer);

        const eventId = await ticketContract.eventIdOf(sellId);
        const eventData = await registryContract.getFunction("getEvent")(eventId);
        const basePriceWei = eventData.basePriceWei;
        const inputPriceWei = ethers.parseEther(sellPrice);

        const estimatedCap = (basePriceWei * 110n) / 100n; 
        
        if (inputPriceWei > estimatedCap) {
             const maxEth = ethers.formatEther(estimatedCap);
             toast.error(`Anti-Scalping: Max price allowed is ${maxEth} ETH`);
             setIsProcessing(false);
             return;
        }

        const isApproved = await ticketContract.isApprovedForAll(account, MARKETPLACE_ADDRESS);
        if (!isApproved) {
            const txApprove = await ticketContract.setApprovalForAll(MARKETPLACE_ADDRESS, true);
            toast.loading("Approving marketplace... (Please wait)", { id: "process" });
            await txApprove.wait();
            toast.success("Approval successful!", { id: "process" });
        }

        const txList = await marketplaceContract.listTicket(sellId, inputPriceWei);
        toast.loading("Listing ticket...", { id: "process" });
        await txList.wait();

        toast.success("Ticket listed for sale!", { id: "process" });
        setSellId(null);
        fetchMyTickets(); 

    } catch (error: any) {
        console.error(error);
        
        if (error.code === "ACTION_REJECTED") {
            toast.error("Transaction rejected by user", { id: "process" });
        } else if (error.message.includes("exceeds cap") || error.message.includes("price")) {
             toast.error("Price too high! Anti-scalping limit reached.", { id: "process" });
        } else {
             toast.error("Failed. Check console for details.", { id: "process" });
        }
    } finally {
        setIsProcessing(false);
    }
  };

  if (!isConnected) return <div className="text-center py-20 text-slate-400">Please connect wallet.</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-2">
        <Ticket className="text-cyan-400" /> My Ticket Inventory
      </h1>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-cyan-500" size={40}/></div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-slate-800">
            <p className="text-slate-400">You don't have any tickets yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tickets.map((ticket) => (
            <div key={ticket.tokenId} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-cyan-500/30 transition flex flex-col group">
              <div className="h-48 bg-slate-800 relative overflow-hidden">
                 <img 
                    src={ticket.image} 
                    alt={ticket.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                 />
                 <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-xs text-white font-mono border border-white/10">
                    Ticket #{ticket.tokenId}
                 </div>
              </div>

              <div className="p-5 flex-1 flex flex-col">
                 <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">{ticket.name}</h3>
                 
                 <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                    <Calendar size={12} />
                    {new Date(ticket.eventDate * 1000).toLocaleDateString()}
                 </div>
                 
                 <div className="mt-auto grid grid-cols-2 gap-3">
                    <button 
                        onClick={() => handleShowQR(ticket)}
                        className="bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition"
                    >
                        <QrCode size={16} /> QR Code
                    </button>
                    <button 
                        onClick={() => setSellId(ticket.tokenId)}
                        className="bg-cyan-900/20 hover:bg-cyan-900/40 text-cyan-400 border border-cyan-900/50 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition"
                    >
                        <Tag size={16} /> Resell
                    </button>
                 </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showQrFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowQrFor(null)}>
            <div className="bg-white p-6 rounded-2xl max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Scan to Enter</h3>
                <div className="bg-white p-2 rounded-lg border-2 border-slate-100 inline-block">
                    <QRCode value={qrData} size={200} />
                </div>
                <p className="text-xs text-slate-400 mt-4 font-mono break-all">Sig: {qrData.slice(-20)}</p>
            </div>
        </div>
      )}

      {sellId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
             <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl max-w-sm w-full">
                <h3 className="text-xl font-bold text-white mb-4">List for Resale</h3>
                <form onSubmit={handleListForSale}>
                    <label className="text-xs font-bold text-slate-500 uppercase">Price (ETH)</label>
                    <input 
                        type="number" step="0.0001" required autoFocus
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 outline-none mb-4 mt-1"
                        placeholder="0.02"
                        value={sellPrice} onChange={(e) => setSellPrice(e.target.value)}
                    />
                    <div className="flex gap-3">
                        <button type="button" onClick={() => setSellId(null)} className="flex-1 bg-slate-800 text-white py-3 rounded-xl font-bold">Cancel</button>
                        <button type="submit" disabled={isProcessing} className="flex-1 bg-cyan-600 text-white py-3 rounded-xl font-bold flex justify-center gap-2">
                            {isProcessing ? <Loader2 className="animate-spin"/> : "List Item"}
                        </button>
                    </div>
                </form>
             </div>
        </div>
      )}
    </div>
  );
}