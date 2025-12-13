import axios from 'axios';

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT 

export const uploadToIPFS = async (file: File): Promise<string | null> => {
  if (!file) return null;

  const formData = new FormData();
  formData.append('file', file);

  const metadata = JSON.stringify({
    name: file.name,
  });
  formData.append('pinataMetadata', metadata);

  const options = JSON.stringify({
    cidVersion: 0,
  });
  formData.append('pinataOptions', options);

  try {
    const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`
      }
    });
    
    return res.data.IpfsHash; 
  } catch (error) {
    console.error("Error uploading to IPFS:", error);
    return null;
  }
};

export const getIPFSUrl = (cid: string) => `https://gateway.pinata.cloud/ipfs/${cid}`;