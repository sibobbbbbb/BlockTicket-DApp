import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { ethers } from 'ethers';
import type { Web3State } from '../types';
import { toast } from 'react-hot-toast';

const Web3Context = createContext<Web3State | undefined>(undefined);

export const Web3Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>("0");
  const [chainId, setChainId] = useState<string | null>(null);

  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error("MetaMask not found!");
      return;
    }

    const toastId = toast.loading("Connecting to Wallet...");

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      await updateBalance(accounts[0]);
      toast.success("Wallet connected successfully!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to connect: " + (err.message || "User rejected"), { id: toastId });
    }
  };

  const updateBalance = async (address: string) => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const bal = await provider.getBalance(address);
    setBalance(ethers.formatEther(bal));

    // Get Chain ID
    const network = await provider.getNetwork();
    setChainId(network.chainId.toString());
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          updateBalance(accounts[0]);
        }
      });

      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
            setAccount(accounts[0]);
            updateBalance(accounts[0]);
            toast.success("Wallet changed successfully!");
        } else {
            setAccount(null);
            setBalance("0");
            toast("Wallet disconnected", { icon: '🔌' });
        }
      });
    }
  }, []);

  return (
    <Web3Context.Provider value={{ account, balance, chainId, isConnected: !!account, connectWallet }}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) throw new Error("useWeb3 must be used within a Web3Provider");
  return context;
};