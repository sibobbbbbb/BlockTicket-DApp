# 🚀 Frontend Full Integration Checklist

*Target: Seamless integration between React (Frontend), Solidity (Blockchain), and Hono (Oracle Service)*

## 🛠 Phase 1: Environment & Configuration

*Menyiapkan "jembatan" agar ketiga sistem bisa saling konek.*

* [ ] **Setup Environment Variables (`.env`)**
* Buat file `.env` di folder `frontend/`.
* Tambahkan URL API Oracle: `VITE_ORACLE_API_URL=http://localhost:3001/api` (Sesuaikan port dari `oracle/src/config/env.ts` ).




* [ ] **Update Contract Artifacts**
* Copy ABI terbaru dari `smart-contract/artifacts/contracts/.../*.json` ke `frontend/src/contracts/`.
* Pastikan ada 4 ABI: `Marketplace`, `TicketNFT`, `EventRegistry`, `OracleConsumer`.


* [ ] **Update Contract Addresses**
* Update `frontend/src/contracts/addresses.ts` dengan alamat hasil deploy terbaru (Ganache).



## 🔐 Phase 2: KYC Integration (Oracle API)

*Integrasi dengan `oracle/src/routes/kyc.ts*`
User harus request ke server (API) agar server menulis statusnya ke blockchain.

* [ ] **Component: KYC Status Badge (Navbar)**
* **Logic:**
1. Ambil `account` dari `Web3Context`.
2. Panggil API: `GET ${VITE_ORACLE_API_URL}/kyc/status/${account}` .


3. Simpan response (`isVerified`, `blocked`, `expiryDate`) ke state local/context.


* **UI:**
* Jika `isVerified: true` -> Badge 🟢 Verified.
* Jika `blocked: true` -> Badge ⚫ BLOCKED.
* Jika `isVerified: false` -> Badge 🔴 Unverified (Klik untuk Verifikasi).




* [ ] **Feature: KYC Registration Form**
* Buat Modal/Page baru: **"Complete Your KYC"**.
* **Form Input:**
* 
`idNumber` (NIK - Validasi 16 digit sesuai `oracle/src/services/kycService.ts` ).


* `email`.


* **Submit Action:**
* Panggil API: `POST ${VITE_ORACLE_API_URL}/kyc/verify` .


* Body JSON: `{ walletAddress: account, idNumber, email }`.


* **Feedback:**
* Tampilkan Loading Spinner (karena Oracle sedang mining transaksi).
* Show Toast Success: *"KYC Verified! You can now buy tickets."*





## 🎟 Phase 3: Admin Dashboard (Event Registry)

*Smart Contract: `EventRegistry.sol*`

* [ ] **Form Create Event (`src/pages/Admin.tsx`)**
* **Input Data:**
* `Sale Start/End`, `Event Start` (Datetime Picker -> Unix Timestamp).
* `Base Price` (IDR/ETH -> Convert to Wei).


* **Upload Poster:**
* Gunakan fungsi IPFS yang sudah ada.


* **Blockchain Transaction:**
* Panggil `EventRegistry.createEvent(...)`.
* **Penting:** Parameter `ticketContract` arahkan ke alamat `TicketNFT` yang sudah di-deploy.





## 🛒 Phase 4: Marketplace (Buying Tickets)

*Smart Contract: `Marketplace.sol*`

* [ ] **Fetch Events (Home Page)**
* Loop data dari contract `EventRegistry`.
* **Note:** Karena data gambar/deskripsi ada di IPFS, kamu mungkin perlu menyimpan *mapping* `eventId -> ipfsCID` di database lokal/file JSON terpisah, atau fetch metadata on-the-fly jika CID disimpan on-chain (tergantung implementasi `createEvent` kamu menyimpan CID di mana).


* [ ] **Buy Action (`buyPrimary`)**
* **Pre-Check:** Cek status KYC user (dari Phase 2). Jika belum verified, munculkan modal KYC.
* **Transaction:**
* Panggil `marketplace.buyPrimary(eventId, qty)`.
* `value`: `basePriceWei * qty`.





## 📦 Phase 5: My Tickets (Inventory & Resale)

*Smart Contract: `TicketNFT.sol` & `Marketplace.sol*`

* [ ] **Fetch Owned Tickets**
* Karena `TicketNFT` tidak punya fungsi `tokensOfOwner` (Standard ERC721), gunakan **Event Filtering**:
* Filter event `TicketMinted(to=userAddress)`.
* Ambil `tokenId` dari event tersebut.
* Cek status saat ini via `TicketNFT.ownerOf(tokenId)` (untuk memastikan tiket belum dijual/dipindah).




* [ ] **Feature: List for Resale**
* **Approval:** Cek `isApprovedForAll`. Jika belum, panggil `setApprovalForAll`.
* **Listing:** Panggil `marketplace.listTicket(tokenId, priceWei)`.
* **Validasi:** Pastikan harga input <= 110% harga awal (Rule Anti-Scalping).


* [ ] **Feature: Generate Secure QR**
* Tombol **"Show QR"**.
* Logic: `signer.signMessage(\`CheckIn-${tokenId}-${timestamp}`)`.
* Render QR Code.



## 🔄 Phase 6: Secondary Market (Resale)

*Smart Contract: `Marketplace.sol*`

* [ ] **Fetch Active Listings**
* Filter event `TicketListed` dari contract `Marketplace`.
* Cek status listing di mapping `listings(tokenId)` apakah `active == true`.


* [ ] **Buy Resale Ticket**
* Panggil `marketplace.buyResale(tokenId)`.
* `value`: Sesuai harga listing (`priceWei`).



## 📱 Phase 7: Gate Scanner (Validator)

*Smart Contract: `TicketNFT.sol*`

* [ ] **Page: `/scanner**` (Khusus Admin/Panitia)
* [ ] **QR Logic:**
* Parse JSON QR Code.
* Recover Address dari Signature (Pastikan yang sign adalah pemilik tiket).


* [ ] **Blockchain Logic:**
* Panggil `ticketNFT.useTicket(tokenId)`.
* Handle Error: Jika tiket sudah USED atau wallet scanner tidak punya `CHECKIN_ROLE`.



---

**Saran Pengerjaan:**
Fokuslah menyelesaikan **Phase 1 dan Phase 2 (KYC)** terlebih dahulu. Ini adalah fitur paling unik dari proyekmu karena melibatkan interaksi full-stack (Frontend <-> Oracle API <-> Blockchain). Setelah fitur KYC jalan, fitur beli tiket lainnya hanyalah transaksi blockchain standar. Selamat coding!