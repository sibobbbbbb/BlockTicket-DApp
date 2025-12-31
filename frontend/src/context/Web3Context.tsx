import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { ethers } from 'ethers';
import type { Web3State, KycStatus } from '../types';
import { toast } from 'react-hot-toast';

const Web3Context = createContext<Web3State | undefined>(undefined);

export const Web3Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>("0");
  const [chainId, setChainId] = useState<string | null>(null);
  const [kycStatus, setKycStatus] = useState<KycStatus | null>(null);

  const refreshKycStatus = async () => {
    if (!account) return;
    
    try {
      const ORACLE_API = import.meta.env.VITE_ORACLE_API_URL; 
      if (!ORACLE_API) {
        console.warn("VITE_ORACLE_API_URL not set in .env");
        return;
      }

      const response = await fetch(`${ORACLE_API}/kyc/status/${account}`);
      const json = await response.json();

      if (json.success) {
        setKycStatus(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch KYC status:", error);
    }
  };

  useEffect(() => {
    if (account) {
      refreshKycStatus();
    } else {
      setKycStatus(null);
    }
  }, [account]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error("MetaMask not found!");
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      await updateBalance(accounts[0]);
      toast.success("Wallet connected successfully!");
    } catch (err: any) {
       console.error(err);
    }
  };

  const updateBalance = async (address: string) => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const bal = await provider.getBalance(address);
    setBalance(ethers.formatEther(bal));
    const network = await provider.getNetwork();
    setChainId(network.chainId.toString());
  };

  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          
          if (accounts.length > 0) {
            await connectWallet(); 
            console.log("Auto-connected to:", accounts[0]);
          }
        } catch (error) {
          console.error("Failed to auto-connect:", error);
        }
      }
    };

    checkConnection();
  }, []);

  useEffect(() => {
    if (window.ethereum) {
       window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
            setAccount(accounts[0]);
            updateBalance(accounts[0]);
        } else {
            setAccount(null);
            setBalance("0");
            setKycStatus(null);
        }
      });
    }
  }, []);

  return (
    <Web3Context.Provider value={{ 
        account, 
        balance, 
        chainId, 
        isConnected: !!account, 
        connectWallet,
        kycStatus, 
        refreshKycStatus 
    }}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) throw new Error("useWeb3 must be used within a Web3Provider");
  return context;
};