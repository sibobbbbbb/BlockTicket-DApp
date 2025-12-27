import toast from 'react-hot-toast';

export const NETWORK_CONFIG = {
  chainId: import.meta.env.VITE_CHAIN_ID,
  chainName: 'Ganache Local',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: [import.meta.env.VITE_RPC_URL],
  blockExplorerUrls: [],
};

export const switchNetwork = async () => {
  if (!window.ethereum) {
    toast.error("MetaMask not found!");
    return;
  }

  const toastId = toast.loading("Connecting to Ganache...");

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: NETWORK_CONFIG.chainId }],
    });
    toast.success("Connected to Ganache Network", { id: toastId });
  } catch (error: any) {
    if (error.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [NETWORK_CONFIG],
        });
        toast.success("Ganache Network added!", { id: toastId });
      } catch (addError) {
        toast.error("Failed to add network", { id: toastId });
      }
    } else {
      console.error(error);
      toast.error("Failed to switch network", { id: toastId });
    }
  }
};