import axios from 'axios';

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;

export const uploadToIPFS = async (file: File): Promise<string | null> => {
  if (!file) return null;
  const formData = new FormData();
  formData.append('file', file);
  
  const metadata = JSON.stringify({ name: file.name });
  formData.append('pinataMetadata', metadata);
  formData.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));

  try {
    const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
      headers: { 'Authorization': `Bearer ${PINATA_JWT}` }
    });
    return res.data.IpfsHash;
  } catch (error) {
    console.error("Error uploading image:", error);
    return null;
  }
};

export const uploadMetadataToIPFS = async (meta: object): Promise<string | null> => {
  try {
    const data = JSON.stringify({
      pinataOptions: { cidVersion: 1 },
      pinataMetadata: { name: `metadata-${Date.now()}.json` },
      pinataContent: meta
    });

    const res = await axios.post("https://api.pinata.cloud/pinning/pinJSONToIPFS", data, {
      headers: { 
        'Authorization': `Bearer ${PINATA_JWT}`,
        'Content-Type': 'application/json'
      }
    });
    return res.data.IpfsHash;
  } catch (error) {
    console.error("Error uploading metadata:", error);
    return null;
  }
};

export const getIPFSUrl = (cid: string) => `https://gateway.pinata.cloud/ipfs/${cid}`;