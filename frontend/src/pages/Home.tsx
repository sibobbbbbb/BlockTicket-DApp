import type { TicketEvent } from "../types";
import { Tag } from "lucide-react";
import { useState, useEffect } from "react";
import { useTicketContract } from "../hooks/useTicketContract";
import { ethers } from "ethers";
import { toast } from "react-hot-toast";
import SkeletonCard from "../components/SkeletonCard";

const MOCK_EVENTS: TicketEvent[] = [
  {
    id: 1,
    name: "Coldplay: Music of the Spheres",
    description: "Experience the magic live in Jakarta.",
    priceInETH: "0.05",
    priceInIDR: 2500000,
    totalStock: 5000,
    sold: 1200,
    imageCID: "QmHash...",
    isOpen: true,
  },
  {
    id: 2,
    name: "Tech Conference 2025",
    description: "The biggest tech gathering in Bandung.",
    priceInETH: "0.01",
    priceInIDR: 500000,
    totalStock: 200,
    sold: 150,
    imageCID: "QmHash...",
    isOpen: true,
  },
];

export default function Home() {
  const contract = useTicketContract();
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [events, setEvents] = useState<TicketEvent[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      setIsFetching(true);

      // TODO: Fetch events from contract
      setTimeout(() => {
        setEvents(MOCK_EVENTS);
        setIsFetching(false);
      }, 2000);
    };

    fetchEvents();
  }, []);

  const handleBuyTicket = async (eventId: number, priceInEth: string) => {
    if (!contract) {
      toast.error("Wallet not connected or contract not ready!");
      return;
    }

    const toastId = toast.loading("Starting transaction in MetaMask...");
    setLoadingId(eventId);

    try {
      const priceInWei = ethers.parseEther(priceInEth);

      const tx = await contract.buyTicket(eventId, {
        value: priceInWei,
      });

      toast.loading(`Transaction sent! Waiting for block confirmation...`, {
        id: toastId,
      });

      await tx.wait();

      toast.success("Success! The ticket is yours (NFT Minted) 🎉", {
        id: toastId,
        duration: 5000,
      });
    } catch (error: any) {
      console.error("Failed to buy:", error);

      let errorMessage = "Transaction failed.";
      if (error.reason) errorMessage = error.reason;
      else if (error.message) errorMessage = error.message.slice(0, 50) + "...";
      toast.error(`Failed: ${errorMessage}`, { id: toastId });
    } finally {
      setLoadingId(null);
    }
  };
  return (
    <section>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Upcoming Events</h1>
        <p className="text-slate-400">
          Secure your tickets on the blockchain. Anti-scalping guaranteed.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isFetching
          ? [1, 2, 3].map((n) => <SkeletonCard key={n} />)
          : events?.map((event) => (
              <article
                key={event.id}
                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-cyan-500/50 transition shadow-lg"
              >
                <div className="h-48 bg-slate-800 w-full flex items-center justify-center text-slate-600">
                  [IPFS Image Placeholder]
                </div>

                <div className="p-5">
                  <h2 className="text-xl font-bold text-white mb-2">
                    {event.name}
                  </h2>
                  <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                    {event.description}
                  </p>

                  <div className="flex justify-between items-center mb-4 text-sm">
                    <div className="flex items-center gap-1 text-cyan-400">
                      <Tag size={16} />
                      <span className="font-bold">{event.priceInETH} ETH</span>
                    </div>
                    <div className="text-slate-500">
                      (~IDR {event.priceInIDR.toLocaleString()})
                    </div>
                  </div>

                  <div className="w-full bg-slate-800 rounded-full h-2 mb-4">
                    <div
                      className="bg-cyan-500 h-2 rounded-full"
                      style={{
                        width: `${(event.sold / event.totalStock) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-center text-slate-500 mb-4">
                    {event.sold} / {event.totalStock} Sold
                  </p>

                  <button
                    className={`w-full font-semibold py-2 rounded-lg transition ${
                      loadingId === event.id
                        ? "bg-slate-700 text-slate-400 cursor-wait"
                        : "bg-cyan-600 hover:bg-cyan-500 text-white"
                    }`}
                    onClick={() => handleBuyTicket(event.id, event.priceInETH)}
                    disabled={loadingId === event.id}
                  >
                    {loadingId === event.id ? "Processing..." : "Buy Ticket"}
                  </button>
                </div>
              </article>
            ))}
      </div>
    </section>
  );
}
