import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import AnimeDetail from './pages/AnimeDetail';
import Watch from './pages/Watch';
import AdminPanel from './pages/AdminPanel';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Hidden admin route - no navbar */}
        <Route path="/anime/suma123admin" element={<AdminPanel />} />

        {/* Public routes with navbar */}
        <Route path="/*" element={
          <div className="app">
            <Navbar />
            <main>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/anime/:slug" element={<AnimeDetail />} />
                <Route path="/watch/:id" element={<Watch />} />
              </Routes>
            </main>
            <Footer />
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;
