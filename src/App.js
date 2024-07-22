import {React,useState,useEffect} from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import Login from './components/Login';
import Slide from './components/Slide';
import Konva from './components/Konva';
import Temp from './components/Temp';
import socketIO from 'socket.io-client';
const socket = socketIO.connect('https://quickcollab-backend-production.up.railway.app');

const App = () => {
  const  [clientId, setClientId] = useState(null)

  useEffect(() => {
    const handleConnect = () => {
      const cID = socket.id;
      console.log("Socket connected with ID:", cID);
      setClientId(cID);
      localStorage.setItem('clientId', cID);


    return () => {
      socket.off("connect"); 
    };
    
    };

    socket.on("connect", handleConnect);

  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login/>} />
        <Route path="/slide/:code" element={<Slide/>} />
        <Route path="/home/:code" element = {<Home socket={socket} clientId={clientId}/>}/>
      </Routes>
    </Router>
  );
};

export default App;
