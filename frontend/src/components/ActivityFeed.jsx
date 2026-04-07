import React, { useState, useEffect } from "react";
import socket from "../socket";

export default function ActivityFeed() {
  const [feed, setFeed] = useState([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const addEvent = (msg, type) => {
      setFeed((prev) => {
        const updated = [...prev, { id: Date.now() + Math.random(), msg, type, time: new Date() }];
        return updated.slice(-10); // keep last 10
      });
    };

    const handleUserJoined = (user) => {
      addEvent(`🟢 ${user.name} entered the cosmos`, "join");
    };

    const handleUserLeft = (user) => {
      addEvent(`🔴 ${user.name} left the cosmos`, "leave");
    };

    const handleProximityEnter = (other) => {
      addEvent(`💬 You are now near ${other.name}`, "near");
    };

    const handleProximityLeave = (other) => {
      addEvent(`👋 ${other.name} moved away`, "far");
    };

    socket.on("user:joined", handleUserJoined);
    socket.on("user:left", handleUserLeft);
    socket.on("proximity:enter", handleProximityEnter);
    socket.on("proximity:leave", handleProximityLeave);

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("user:left", handleUserLeft);
      socket.off("proximity:enter", handleProximityEnter);
      socket.off("proximity:leave", handleProximityLeave);
    };
  }, []);

  if (feed.length === 0 && !isCollapsed) return null;

  return (
    <div className="absolute bottom-[96px] left-6 z-40 w-72 pointer-events-auto">
      <div className="bg-[#1A1D24]/90 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl overflow-hidden transition-all duration-300">
        <div 
          className="flex justify-between items-center px-4 py-2 bg-white/5 border-b border-white/10 cursor-pointer hover:bg-white/10"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <span className="text-xs font-bold text-[#00F0FF] uppercase tracking-wider">TuteDude Feed</span>
          <button className="text-gray-400 hover:text-white transition-colors">
            {isCollapsed ? "▲" : "▼"}
          </button>
        </div>
        
        {!isCollapsed && (
          <div className="p-3 max-h-48 overflow-y-auto space-y-2 text-sm pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {feed.map((item) => (
              <div key={item.id} className="flex flex-col animate-fade-in-right">
                <span className="text-gray-300">
                   {item.msg}
                </span>
                <span className="text-[10px] text-gray-500 mt-0.5">
                   {item.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
