import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../context/Web3Context";
import {
  MARKETPLACE_ADDRESS,
  TICKET_NFT_ADDRESS,
  EVENT_REGISTRY_ADDRESS,
} from "../contracts/addresses";
import MarketplaceABI from "../contracts/MarketplaceABI.json";
import TicketNFTABI from "../contracts/TicketNFTABI.json";
import EventRegistryABI from "../contracts/EventRegistryABI.json";
import { Loader2, ShoppingBag, ShieldAlert, Tag } from "lucide-react";
import toast from "react-hot-toast";

interface ResaleItem {
  tokenId: number;
  eventId: number;
  seller: string;
  priceEth: string;
  priceWei: bigint;
  name: string;
  image: string;
}

export default function Resale() {
  const { account, isConnected, kycStatus } = useWeb3();
  const [listings, setListings] = useState<ResaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<number | null>(null);

  useEffect(() => {
    if (isConnected) fetchListings();
  }, [isConnected]);

  const fetchListings = async () => {
    if (!window.ethereum) return;
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MarketplaceABI, provider);
      const ticketContract = new ethers.Contract(TICKET_NFT_ADDRESS, TicketNFTABI, provider);
      const registry = new ethers.Contract(EVENT_REGISTRY_ADDRESS, EventRegistryABI, provider);

      const filter = marketplace.filters.TicketListed();
      const logs = await marketplace.queryFilter(filter);

      const activeListings: ResaleItem[] = [];
      const processedTokens = new Set<number>();

      for (const log of logs.reverse()) {
        const parsed = marketplace.interface.parseLog(log);
        if (!parsed) continue;
        
        const tokenId = Number(parsed.args[0]);
        
        if (processedTokens.has(tokenId)) continue;
        processedTokens.add(tokenId);

        const listing = await marketplace.listings(tokenId);
        
        if (!listing.active) continue;

        const eventId = await ticketContract.eventIdOf(tokenId);
        const eventData = await registry.getFunction("getEvent")(eventId);
        
        let meta = { name: `Ticket #${tokenId}`, image: "" };
        let metadataUri = eventData.metadataURI;

        if (metadataUri && metadataUri.startsWith("ipfs://")) {
             try {
                const gateway = `https://gateway.pinata.cloud/ipfs/${metadataUri.replace("ipfs://", "")}`;
                const res = await fetch(gateway);
                const json = await res.json();
                meta = { ...meta, ...json };
             } catch (e) {}
        }

        let imageUrl = meta.image;
        if (imageUrl && imageUrl.startsWith("ipfs://")) {
            imageUrl = `https://gateway.pinata.cloud/ipfs/${imageUrl.replace("ipfs://", "")}`;
        }

        activeListings.push({
            tokenId,
            eventId: Number(eventId),
            seller: listing.seller,
            priceEth: ethers.formatEther(listing.priceWei),
            priceWei: listing.priceWei,
            name: meta.name,
            image: imageUrl || "https://placehold.co/400?text=Ticket"
        });
      }

      setListings(activeListings);
    } catch (error) {
      console.error("Error loading resale:", error);
      toast.error("Failed to load resale market");
    } finally {
      setLoading(false);
    }
  };

  const handleBuyResale = async (item: ResaleItem) => {
    if (!account) return toast.error("Connect wallet first");

    if (!kycStatus?.isVerified) {
      toast.error("Anti-Scalping: You must verify KYC to buy resale tickets!");
      return;
    }

    if (item.seller.toLowerCase() === account.toLowerCase()) {
      toast.error("You cannot buy your own ticket!");
      return;
    }

    try {
      setBuyingId(item.tokenId);
      const toastId = toast.loading("Buying ticket...");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const marketplace = new ethers.Contract(
        MARKETPLACE_ADDRESS,
        MarketplaceABI,
        signer
      );

      const tx = await marketplace.buyResale(item.tokenId, {
        value: item.priceWei,
      });

      toast.loading("Waiting for confirmation...", { id: toastId });
      await tx.wait();

      toast.success("Ticket Purchased! Welcome to the event.", { id: toastId });
      fetchListings();
    } catch (error: any) {
      console.error(error);
      toast.error(error.reason || "Purchase failed");
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4 flex justify-center items-center gap-3">
          <ShoppingBag className="text-purple-400" size={40} /> Secondary Market
        </h1>
        <p className="text-slate-400">
          Official Resale Platform. Fair prices, verified sellers, no scalpers.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-purple-500" size={40} />
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-slate-800">
          <Tag className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white">Market is Empty</h3>
          <p className="text-slate-400">
            No resale tickets available at the moment.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {listings.map((item) => (
            <div
              key={item.tokenId}
              className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-purple-500/50 transition duration-300 shadow-lg group"
            >
              <div className="h-48 relative overflow-hidden">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition"
                />
                <div className="absolute top-2 right-2 bg-purple-600 text-white font-bold px-3 py-1 rounded-full text-sm shadow-lg border border-white/20">
                  {item.priceEth} ETH
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">
                  {item.name}
                </h3>
                <div className="flex justify-between items-center mb-6">
                  <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded border border-slate-700">
                    Token #{item.tokenId}
                  </span>
                  <span className="text-xs text-slate-400">
                    From: {item.seller.slice(0, 6)}...{item.seller.slice(-4)}
                  </span>
                </div>

                {!kycStatus?.isVerified && (
                  <div className="mb-3 flex items-center gap-2 text-xs text-red-400 bg-red-900/20 p-2 rounded-lg border border-red-900/30">
                    <ShieldAlert size={14} /> KYC Required
                  </div>
                )}

                <button
                  onClick={() => handleBuyResale(item)}
                  disabled={buyingId === item.tokenId || !kycStatus?.isVerified}
                  className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition 
                        ${
                          !kycStatus?.isVerified
                            ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                            : "bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-900/20"
                        }`}
                >
                  {buyingId === item.tokenId ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    "Buy Resale Ticket"
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
