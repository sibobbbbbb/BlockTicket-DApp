import { useState } from 'react';
import QrReader from 'react-qr-reader-es6';
import { ethers } from "ethers";
import { TICKET_NFT_ADDRESS } from "../contracts/addresses";
import TicketNFTABI from "../contracts/TicketNFTABI.json";
import { Scan, CheckCircle2, XCircle, Loader2, RefreshCcw, ShieldCheck } from 'lucide-react';
import toast from "react-hot-toast";

export default function Scanner() {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [ticketDetails, setTicketDetails] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleScan = async (data: string | null) => {
    if (!data || status !== 'idle') return;

    setStatus('processing');
    setScanResult(data);
    const toastId = toast.loading("Verifying Ticket...");

    try {
        const qrData = JSON.parse(data);
        const { id, eid, owner, ts, sig } = qrData;

        if (!id || !owner || !sig || !ts) throw new Error("Invalid QR Data Structure");

        const originalMessage = `CheckIn-${id}-${eid}-${ts}`;
        
        const recoveredAddress = ethers.verifyMessage(originalMessage, sig);

        if (recoveredAddress.toLowerCase() !== owner.toLowerCase()) {
            throw new Error("FAKE QR! Signature mismatch.");
        }

        const provider = new ethers.JsonRpcProvider(import.meta.env.VITE_RPC_URL);
        const ticketContract = new ethers.Contract(TICKET_NFT_ADDRESS, TicketNFTABI, provider);

        const currentOwnerOnChain = await ticketContract.ownerOf(id);

        if (currentOwnerOnChain.toLowerCase() !== recoveredAddress.toLowerCase()) {
             throw new Error("OWNERSHIP INVALID! Ticket has been sold/transferred.");
        }

        setStatus('success');
        setTicketDetails({ id, eid, owner });
        toast.success("TICKET VALID! Access Granted.", { id: toastId });

    } catch (error: any) {
        console.error(error);
        setStatus('error');
        setErrorMsg(error.message || "Scan Failed");
        toast.error("INVALID TICKET! Access Denied.", { id: toastId });
    }
  };

  const handleError = (err: any) => {
    console.error(err);
    toast.error("Camera Error: Check permissions");
  };

  const resetScan = () => {
    setScanResult(null);
    setStatus('idle');
    setTicketDetails(null);
    setErrorMsg("");
  };

  return (
    <div className="max-w-md mx-auto py-8 px-4">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-2">
          <Scan className="text-green-400" /> Gate Scanner
        </h1>
        <p className="text-slate-400 text-sm">For Event Staff Only</p>
      </div>

      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl overflow-hidden shadow-2xl relative aspect-square flex items-center justify-center">
        
        {status === 'idle' && (
           <>
             <QrReader
                delay={300}
                onError={handleError}
                onScan={handleScan}
                style={{ width: '100%', height: '100%' }}
                facingMode={"environment"}
             />
             <div className="absolute inset-0 border-2 border-green-500/50 animate-pulse pointer-events-none"></div>
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-500 text-sm bg-slate-900/80 px-3 py-1 rounded-full">
                Point Camera at QR Code
             </div>
           </>
        )}

        {status === 'processing' && (
            <div className="flex flex-col items-center animate-pulse">
                <Loader2 size={60} className="text-cyan-500 animate-spin mb-4" />
                <p className="text-white font-bold">Verifying on Blockchain...</p>
            </div>
        )}

        {status === 'success' && ticketDetails && (
            <div className="bg-green-900/90 absolute inset-0 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm">
                <CheckCircle2 size={80} className="text-green-400 mb-4 shadow-lg rounded-full bg-white" />
                <h2 className="text-3xl font-bold text-white mb-2">ACCESS GRANTED</h2>
                <div className="bg-black/30 p-4 rounded-xl text-left w-full space-y-2 border border-green-500/30">
                    <p className="text-green-300"><ShieldCheck size={16} className="inline mr-2"/> Ticket ID: <span className="font-bold text-white">#{ticketDetails.id}</span></p>
                    <p className="text-green-300">📅 Event ID: <span className="font-bold text-white">{ticketDetails.eid}</span></p>
                    <p className="text-green-300 text-xs truncate">👤 Owner: {ticketDetails.owner}</p>
                </div>
            </div>
        )}

        {status === 'error' && (
            <div className="bg-red-900/90 absolute inset-0 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm">
                <XCircle size={80} className="text-red-500 mb-4 shadow-lg rounded-full bg-white" />
                <h2 className="text-3xl font-bold text-white mb-2">ACCESS DENIED</h2>
                <p className="text-red-200 font-bold text-lg bg-red-950/50 px-4 py-2 rounded-lg border border-red-500/50">
                    {errorMsg}
                </p>
            </div>
        )}
      </div>

      {status !== 'idle' && status !== 'processing' && (
        <button 
            onClick={resetScan}
            className="w-full mt-6 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition"
        >
            <RefreshCcw /> Scan Next Person
        </button>
      )}
    </div>
  );
}