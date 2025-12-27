import { useState, type ChangeEvent } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../context/Web3Context";
import { uploadToIPFS, uploadMetadataToIPFS } from '../utils/ipfs';
import { 
    EVENT_REGISTRY_ADDRESS, 
    TICKET_NFT_ADDRESS,
    MARKETPLACE_ADDRESS
} from '../contracts/addresses';
import EventRegistryABI from '../contracts/EventRegistryABI.json';
import MarketplaceABI from '../contracts/MarketplaceABI.json';
import toast from "react-hot-toast";
import { Upload, Calendar, Clock, DollarSign, Box, Settings } from "lucide-react";

export default function Admin() {
  const { isConnected } = useWeb3();
  
  const [form, setForm] = useState({
    name: "",
    description: "",
    priceIdr: "",
    stock: "",
    saleStart: "",
    saleEnd: "",
    eventDate: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const toUnix = (dateString: string) => Math.floor(new Date(dateString).getTime() / 1000);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleCreateEvent = async () => {
    if (!window.ethereum || !isConnected) return toast.error("Wallet not connected!");
    if (!file) return toast.error("Event poster is required!");
    if (!form.saleStart || !form.saleEnd || !form.eventDate) return toast.error("All dates are required!");

    const toastId = toast.loading("Starting creation process...");
    setIsUploading(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const registryContract = new ethers.Contract(EVENT_REGISTRY_ADDRESS, EventRegistryABI, signer);
      const marketplaceContract = new ethers.Contract(MARKETPLACE_ADDRESS, MarketplaceABI, signer);

      const saleStartUnix = toUnix(form.saleStart);
      const saleEndUnix = toUnix(form.saleEnd);
      const eventStartUnix = toUnix(form.eventDate);

      if (saleStartUnix >= saleEndUnix) throw new Error("Sale End must be after Start");

      toast.loading("Uploading poster...", { id: toastId });
      const imageCid = await uploadToIPFS(file);
      if (!imageCid) throw new Error("Failed to upload image");

      const metadata = {
        name: form.name,
        description: form.description,
        image: `ipfs://${imageCid}`,
        attributes: [
            { trait_type: "Stock", value: form.stock }, 
            { trait_type: "Location", value: "Jakarta Convention Center" }
        ]
      };
      const metadataCid = await uploadMetadataToIPFS(metadata);
      if (!metadataCid) throw new Error("Failed to upload metadata");
      const metadataURI = `ipfs://${metadataCid}`;

      const nextId = await registryContract.nextEventId();
      const eventId = Number(nextId); 

      toast.loading("Tx 1/2: Creating Event...", { id: toastId });
      
      const priceWei = ethers.parseEther(form.priceIdr || "0");
      const txCreate = await registryContract.createEvent(
        TICKET_NFT_ADDRESS,
        saleStartUnix,
        saleEndUnix,
        eventStartUnix,
        priceWei,
        metadataURI 
      );
      await txCreate.wait();

      toast.loading("Tx 2/2: Activating Resale Rules...", { id: toastId });
      
      const txConfig = await marketplaceContract.setEventConfig(
        eventId,
        true, // resale
        15000, 
        4, // max resale
        500); 
      await txConfig.wait();

      toast.success("Event & Rules Configured Successfully! 🎉", { id: toastId });

      setForm({ name: "", description: "", priceIdr: "", stock: "", saleStart: "", saleEnd: "", eventDate: "" });
      setFile(null);

    } catch (error: any) {
      console.error(error);
      toast.error(`Failed: ${error.reason || error.message}`, { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  if (!isConnected) return <div className="text-center py-20 text-slate-400">Connect Wallet First</div>;

  return (
    <section className="max-w-3xl mx-auto py-10 px-4">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-cyan-500/10 rounded-xl">
             <Settings className="text-cyan-400 w-8 h-8" />
        </div>
        <div>
            <h1 className="text-3xl font-bold text-white">Organizer Dashboard</h1>
            <p className="text-slate-400">Create event and configure anti-scalping rules.</p>
        </div>
      </div>

      <div className="bg-slate-900/50 backdrop-blur-sm p-8 rounded-2xl border border-slate-800 shadow-2xl">
        <div className="space-y-6">
          <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Event Name</label>
                <input name="name" value={form.name} onChange={handleChange} type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 outline-none" placeholder="Ex: Coldplay Jakarta" />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows={3} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 outline-none" placeholder="Event details..." />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-slate-400 mb-1 flex items-center gap-2"><DollarSign size={14}/> Price (ETH)</label>
              <input name="priceIdr" value={form.priceIdr} onChange={handleChange} type="number" step="0.0001" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 outline-none" placeholder="0.01" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-400 mb-1 flex items-center gap-2"><Box size={14}/> Total Stock</label>
              <input name="stock" value={form.stock} onChange={handleChange} type="number" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 outline-none" placeholder="1000" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Sale Start</label>
                <div className="relative"><Clock className="absolute left-3 top-3 text-slate-500" size={16} /><input type="datetime-local" name="saleStart" value={form.saleStart} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 pl-10 text-sm text-white focus:border-cyan-500 outline-none scheme-dark" /></div>
             </div>
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Sale End</label>
                <div className="relative"><Clock className="absolute left-3 top-3 text-slate-500" size={16} /><input type="datetime-local" name="saleEnd" value={form.saleEnd} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 pl-10 text-sm text-white focus:border-cyan-500 outline-none scheme-dark" /></div>
             </div>
             <div>
                <label className="block text-xs font-bold text-cyan-500 uppercase mb-2">Event Date</label>
                <div className="relative"><Calendar className="absolute left-3 top-3 text-cyan-500" size={16} /><input type="datetime-local" name="eventDate" value={form.eventDate} onChange={handleChange} className="w-full bg-slate-950 border border-cyan-500/50 rounded-lg p-2.5 pl-10 text-sm text-white focus:border-cyan-500 outline-none scheme-dark" /></div>
             </div>
          </div>

          <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Event Poster (IPFS)</label>
              <div className="flex items-center justify-center w-full">
                <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition ${file ? 'border-cyan-500 bg-cyan-500/5' : 'border-slate-700 bg-slate-800 hover:bg-slate-700'}`}>
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className={`w-8 h-8 mb-2 ${file ? 'text-cyan-400' : 'text-slate-400'}`} />
                        <p className="text-sm text-slate-300 font-medium">{file ? file.name : "Upload Poster"}</p>
                    </div>
                    <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                </label>
            </div>
          </div>

          <button 
            onClick={handleCreateEvent}
            disabled={isUploading}
            className="w-full bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl mt-4 transition shadow-lg shadow-cyan-500/20 flex justify-center items-center gap-2"
          >
            {isUploading ? "Processing..." : "Create Event & Set Rules"}
          </button>
        </div>
      </div>
    </section>
  );
}