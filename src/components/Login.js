import React, { useRef, useState } from "react";
import style from "./CSS/login.module.css";
import { useNavigate } from "react-router-dom";

const Login = ({setUserName,socket}) => {
  const navigate = useNavigate();
  const nameRefCreate = useRef(null);
  const roomCodeRefCreate = useRef(null);
  const nameRefJoin = useRef(null);
  const roomCodeRefJoin = useRef(null);

  const [createDisabled, setCreateDisabled] = useState(true);
  const [joinDisabled, setJoinDisabled] = useState(true);

  const handleInputChange = () => {
    const nameCreate = nameRefCreate.current.value.trim();
    const roomCodeCreate = roomCodeRefCreate.current.value.trim();
    const nameJoin = nameRefJoin.current.value.trim();
    const roomCodeJoin = roomCodeRefJoin.current.value.trim();

    setCreateDisabled(!(nameCreate && /^[0-9]+$/.test(roomCodeCreate)));
    setJoinDisabled(!(nameJoin && /^[0-9]+$/.test(roomCodeJoin)));
  };

  const CreatRoom = () => {
    const name = nameRefCreate.current.value.trim();
    const roomCode = roomCodeRefCreate.current.value.trim();
    setUserName(name)
    localStorage.setItem('userName', name);
    if (name && /^[0-9]+$/.test(roomCode)) {
      
      socket.emit("register",{
        roomCode : roomCode,
        userId : socket.id
      });

      navigate(`/home/${roomCode}`);
    } else {
      alert("Please enter a valid name and room number.");
    }
  };

  const JoinRoom = () => {
    const name = nameRefJoin.current.value.trim();
    const roomCode = roomCodeRefJoin.current.value.trim();
    setUserName(name)
    localStorage.setItem('userName', name);
    if (name && /^[0-9]+$/.test(roomCode)) {

      navigate(`/home/${roomCode}`);
    } else {
      alert("Please enter a valid name and room number.");
    }
  };

  return (
    <div className={style.background}>
      <div className={style.header}>
        Quick <span>Collab</span>
      </div>
      <div className={style.container}></div>
      <div className={style.wrapper}>
        <div className={style.grid}>
          <div className={style.LEFT}>
            <div className={style.icon}>
              {/* <img src="task.png" alt="hiii" /> */}
            </div>

            <div className={style.starter}>
              <h3>Done Work Collaboratively,</h3>
              <h1>@ One Place</h1>
            </div>

            <div className={style.hero}>
              <img src="hero.png" alt="" />
            </div>
          </div>

          <div className={style.right}>
            <div className={style.colelement}>
              <div className={style.heading}>Create Room</div>

              <div className={style.form}>
                <form>
                  <input
                    placeholder="Name"
                    name="name"
                    ref={nameRefCreate}
                    onChange={handleInputChange}
                  />
                  <input
                    placeholder="Room No. (Enter Number)"
                    name="roomCode"
                    type="text"
                    required
                    ref={roomCodeRefCreate}
                    onChange={handleInputChange}
                    maxLength={10} // Limit length if needed
                  />
                 
                  <div
                    className={style.submit}
                    onClick={CreatRoom}
                    style={{ cursor: createDisabled ? 'not-allowed' : 'pointer', opacity: createDisabled ? 0.5 : 1 }}
                  >
                    Create Room
                  </div>
                </form>
              </div>

              {/* <div className={style.OR}>
                -OR-
              </div> */}

              <div className={style.heading}>Join Room</div>

              <div className={style.form}>
                <form>
                  <input
                    placeholder="Name"
                    name="name"
                    ref={nameRefJoin}
                    onChange={handleInputChange}
                  />
                  <input
                    placeholder="Room No. (Enter Number)"
                    name="roomCode"
                    type="text"
                    ref={roomCodeRefJoin}
                    onChange={handleInputChange}
                    maxLength={10} // Limit length if needed
                  />
                 
                  <div
                    className={style.submit}
                    onClick={JoinRoom}
                    style={{ cursor: joinDisabled ? 'not-allowed' : 'pointer', opacity: joinDisabled ? 0.5 : 1 }}
                  >
                    Join Room
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
