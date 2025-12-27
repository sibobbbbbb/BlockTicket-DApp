import { useState } from "react";
import { X, ShieldCheck, Loader2 } from "lucide-react";
import { useWeb3 } from "../context/Web3Context";
import toast from "react-hot-toast";

interface KycModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KycModal({ isOpen, onClose }: KycModalProps) {
  const { account, refreshKycStatus } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    idNumber: "", 
    email: "",
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;

    setLoading(true);
    const toastId = toast.loading("Submitting verification to Oracle...");

    try {
      const ORACLE_API = import.meta.env.VITE_ORACLE_API_URL;
      
      const res = await fetch(`${ORACLE_API}/kyc/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: account,
          fullName: formData.fullName,
          idNumber: formData.idNumber,
          email: formData.email,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        if (data.error && Array.isArray(data.error)) {
           throw new Error(data.error[0].message || "Validation failed");
        }
        throw new Error(data.error || "Verification failed");
      }

      toast.success("KYC Verified! Identity recorded on blockchain.", { id: toastId });
      
      await refreshKycStatus();
      onClose();
      
    } catch (error: any) {
      console.error(error);
      toast.error(error.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-md relative shadow-2xl">
        <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-cyan-500/10 rounded-full flex items-center justify-center mb-3">
            <ShieldCheck className="text-cyan-400" size={24} />
          </div>
          <h2 className="text-2xl font-bold text-white">Identity Verification</h2>
          <p className="text-slate-400 text-sm text-center mt-1">
            Required to prevent scalping. Your NIK is hashed securely.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-300">Full Name</label>
            <input
              type="text"
              required
              placeholder="Sesuai KTP"
              className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none"
              value={formData.fullName}
              onChange={(e) => setFormData({...formData, fullName: e.target.value})}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300">National ID (NIK)</label>
            <input
              type="text"
              required
              minLength={16}
              maxLength={16}
              placeholder="16-digit NIK"
              className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none"
              value={formData.idNumber}
              onChange={(e) => setFormData({...formData, idNumber: e.target.value})}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300">Email Address</label>
            <input
              type="email"
              required
              placeholder="farhan@example.com"
              className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white font-bold py-3 rounded-lg transition mt-2 flex items-center justify-center gap-2"
          >
            {loading ? (
                <>
                    <Loader2 className="animate-spin" size={18} /> Verifying...
                </>
            ) : "Submit Verification"}
          </button>
        </form>
      </div>
    </div>
  );
}