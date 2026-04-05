import { useState, useEffect } from "react";
import Cosmos from "./Cosmos";
import ChatPanel from "./components/ChatPanel";
import socket from "./socket";

function App() {
  const [room, setRoom] = useState(null);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    socket.on("connect", () => {
      setIsConnected(true);
    });

    socket.on("joinedRoom", (roomName) => {
      setRoom(roomName);
    });

    socket.on("leftRoom", () => {
      setRoom(null);
      setConnectedUsers([]);
    });

    return () => {
      socket.off("connect");
      socket.off("joinedRoom");
      socket.off("leftRoom");
    };
  }, []);

  return (
    <div className="w-screen h-screen flex bg-[#0B0E14] overflow-hidden font-sans">
      <div className="relative flex-1 flex items-center justify-center bg-black/50">
        {!isConnected && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/80 backdrop-blur-sm">
            <div className="text-[#00F0FF] animate-pulse font-mono text-xl">Connecting to Cosmos...</div>
          </div>
        )}
        
        {/* Cosmos Canvas Container */}
        <div className="relative w-[1200px] h-[800px] rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,240,255,0.1)] border border-white/5">
          <Cosmos 
             onProximityChange={(inRange, users) => {
               if (inRange) {
                 setConnectedUsers(users);
               } else {
                 setConnectedUsers([]);
               }
             }}
          />
        </div>
      </div>

      {room && (
        <div className="absolute right-0 top-0 h-full z-10 animate-fade-in-right">
           <ChatPanel 
             room={room} 
             connectedUsers={connectedUsers} 
             currentUserId={socket.id}
           />
        </div>
      )}
    </div>
  );
}

export default App;