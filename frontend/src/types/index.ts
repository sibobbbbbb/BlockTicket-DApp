export interface TicketEvent {
  id: number;
  name: string;
  description: string;
  priceInETH: string;
  priceInIDR: number;
  totalStock: number;
  sold: number;
  imageCID: string;
  isOpen: boolean;
}

export interface KycStatus {
  isVerified: boolean;
  identityHash: string | null;
  maxTickets: number;
  blocked: boolean;
  expiry: number | null;
  expiryDate: string | null;
  isExpired: boolean;
}

export interface Web3State {
  account: string | null;
  chainId: string | null;
  balance: string;
  isConnected: boolean;
  connectWallet: () => Promise<void>;
  kycStatus: KycStatus | null;
  refreshKycStatus: () => Promise<void>;
}