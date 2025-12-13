import { useState, type ChangeEvent } from "react";
import { useWeb3 } from "../context/Web3Context";
import { useTicketContract } from "../hooks/useTicketContract";
import { uploadToIPFS } from "../utils/ipfs";
import toast from "react-hot-toast";
import { Upload, Plus } from "lucide-react";

export default function Admin() {
  const { isConnected } = useWeb3();
  const contract = useTicketContract();

  // State
  const [form, setForm] = useState({
    name: "",
    priceIdr: "",
    stock: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Handle Text Input
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Handle File Input
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Submit Logic
  const handleCreateEvent = async () => {
    if (!contract || !isConnected) return toast.error("Wallet not connected!");
    if (!file) return toast.error("Event poster is required!");

    const toastId = toast.loading("Uploading image to IPFS...");
    setIsUploading(true);

    try {
      const cid = await uploadToIPFS(file);
      if (!cid) throw new Error("Failed to upload to IPFS");

      toast.loading("Requesting transaction confirmation...", { id: toastId });

      const tx = await contract.createEvent(
        form.name,
        parseInt(form.priceIdr),
        parseInt(form.stock),
        cid
      );

      toast.loading("Waiting for block mining...", { id: toastId });
      await tx.wait();

      toast.success("Event created successfully! 🎉", { id: toastId });

      setForm({ name: "", priceIdr: "", stock: "" });
      setFile(null);
    } catch (error: any) {
      console.error(error);
      toast.error(`Failed: ${error.reason || error.message}`, { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="text-center py-20 text-red-400">
        Please connect wallet first.
      </div>
    );
  }

  return (
    <section className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-6">Admin Dashboard</h1>

      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <Plus className="text-cyan-400" /> Create New Event
        </h2>
        
        <div className="space-y-4">
          {/* Nama Event */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Event Name</label>
            <input 
                name="name"
                value={form.name}
                onChange={handleChange}
                type="text" 
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none transition" 
                placeholder="Ex: Coldplay Jakarta"
            />
          </div>
          
          {/* Harga & Stok */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Price (IDR)</label>
              <input 
                name="priceIdr"
                value={form.priceIdr}
                onChange={handleChange}
                type="number" 
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none" 
                placeholder="150000" 
            />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Total Stock</label>
              <input 
                name="stock"
                value={form.stock}
                onChange={handleChange}
                type="number" 
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none" 
                placeholder="500" 
            />
            </div>
          </div>

          {/* Upload File */}
          <div>
             <label className="block text-sm font-medium text-slate-400 mb-1">Event Poster (IPFS)</label>
             <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-700 border-dashed rounded-lg cursor-pointer bg-slate-800 hover:bg-slate-700 transition">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-3 text-slate-400" />
                        <p className="text-sm text-slate-400">
                            {file ? file.name : "Click to upload image"}
                        </p>
                    </div>
                    <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                </label>
            </div>
          </div>

          <button 
            onClick={handleCreateEvent}
            disabled={isUploading}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white font-bold py-3 rounded-lg mt-4 transition flex justify-center items-center gap-2"
          >
            {isUploading ? "Uploading to IPFS & Blockchain..." : "Mint Event NFT"}
          </button>
        </div>
      </div>
    </section>
  );
}
