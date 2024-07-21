

import socketIO from 'socket.io-client';
import { useNavigate } from "react-router-dom";
import { useState } from 'react';
const socket = socketIO.connect('http://localhost:4000');



const  Temp= ()=> {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem('userName', userName);
    navigate('/slide/:code');
    socket.emit("SendMessege",{
      text:"Hello I am Bhautiksinh Vala"
    })
  };
  return (
    <form className="home__container" onSubmit={handleSubmit}>
      <h2 className="home__header">Sign in to Open Chat</h2>
      <label htmlFor="username">Username</label>
      <input
        type="text"
        minLength={6}
        name="username"
        id="username"
        className="username__input"
        value={userName}
        onChange={(e) => setUserName(e.target.value)}
      />
      <button className="home__cta">SIGN IN</button>
    </form>
  );
}

export default Temp;