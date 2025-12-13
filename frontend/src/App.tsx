import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Web3Provider } from './context/Web3Context';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Admin from './pages/Admin';
import MyTickets from './pages/MyTickets';

function App() {
  return (
    <Web3Provider>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#1e293b', color: '#fff' }
      }}/>
      
      <BrowserRouter>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/my-tickets" element={<MyTickets />} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </Web3Provider>
  );
}

export default App;