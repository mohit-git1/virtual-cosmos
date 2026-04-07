import { useState, useEffect } from "react";
import Cosmos from "./Cosmos";
import ChatPanel from "./components/ChatPanel";
import TopBar from "./components/TopBar";
import BottomControls from "./components/BottomControls";
import JoinScreen from "./components/JoinScreen";
import ActivityFeed from "./components/ActivityFeed";
import socket from "./socket";

function App() {
  const [room, setRoom] = useState(null);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (socket.connected) {
      setIsConnected(true);
    }

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

  const handleJoin = (name) => {
    socket.connect();
    setUsername(name);
    setHasJoined(true);
  };

  return (
    <div id="app" className="w-screen h-screen flex flex-col bg-[#11141C] overflow-hidden font-sans text-white">
      {!hasJoined ? (
        <JoinScreen onJoin={handleJoin} />
      ) : (
        <>
          <TopBar />
          
          <div className="flex-1 relative flex overflow-hidden">
            <div className="w-full flex-1 relative bg-black/50 overflow-hidden cosmos-world">
              {!isConnected && (
                <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/80 backdrop-blur-sm">
                  <div className="text-[#00F0FF] animate-pulse font-mono text-xl">Connecting to Cosmos...</div>
                </div>
              )}
              
              <Cosmos 
                 username={username}
                 onProximityChange={(inRange, users) => {
                   if (inRange) {
                     setConnectedUsers(users);
                   } else {
                     setConnectedUsers([]);
                   }
                 }}
              />
            </div>
            
            <ActivityFeed />

            {room && (
              <div className="absolute right-0 top-0 bottom-0 z-10 animate-fade-in-right">
                 <ChatPanel 
                   room={room} 
                   connectedUsers={connectedUsers} 
                   currentUserId={socket.id}
                 />
              </div>
            )}
          </div>

          <BottomControls />
        </>
      )}
    </div>
  );
}

export default App;