import toast from 'react-hot-toast';

export const LOCAL_NETWORK_CONFIG = {
  chainId: '0x539',
  chainName: 'Localhost 8545',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: ['http://127.0.0.1:8545'],
};

export const switchNetwork = async () => {
  if (!window.ethereum) return;

  const toastId = toast.loading("Switching network...");

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: LOCAL_NETWORK_CONFIG.chainId }],
    });
    toast.success("Switched to Private Chain Localhost", { id: toastId });
  } catch (error: any) {
    if (error.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [LOCAL_NETWORK_CONFIG],
        });
        toast.success("Network Localhost added!", { id: toastId });
      } catch (addError) {
        toast.error("Failed to add network", { id: toastId });
      }
    } else {
      toast.dismiss(toastId);
    }
  }
};