import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../context/Web3Context';
import { TICKET_CONTRACT_ADDRESS } from '../contracts/addresses';
import TicketABI from '../contracts/TicketContractABI.json';

export const useTicketContract = () => {
  const { account } = useWeb3();
  const [contract, setContract] = useState<ethers.Contract | null>(null);

  useEffect(() => {
    const initContract = async () => {
      if (window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          
          let runner;
          if (account) {
            runner = await provider.getSigner();
          } else {
            runner = provider;
          }

          const ticketContract = new ethers.Contract(
            TICKET_CONTRACT_ADDRESS,
            TicketABI,
            runner
          );

          setContract(ticketContract);
        } catch (error) {
          console.error("Error initializing contract:", error);
        }
      }
    };

    initContract();
  }, [account]);

  return contract;
};