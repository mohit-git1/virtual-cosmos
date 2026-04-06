import { useState, useEffect, useRef } from "react";
import socket from "../socket";

export default function ChatPanel({ room, connectedUsers, currentUserId }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Clear messages when room changes
    setMessages([]);
    
    const handleNewMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on("chatMessage", handleNewMessage);

    return () => {
      socket.off("chatMessage", handleNewMessage);
    };
  }, [room]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim() === "") return;

    const newMsg = {
      room,
      senderId: currentUserId,
      text: inputText,
      timestamp: Date.now(),
    };

    socket.emit("sendMessage", newMsg);
    setMessages((prev) => [...prev, newMsg]); // Optimistic update
    setInputText("");
  };

  if (!room) return null;

  return (
    <div className="chat-panel flex flex-col h-full w-[350px] bg-cosmos-panel/90 backdrop-blur-md border-l border-white/10 shadow-2xl">
      <div className="p-5 border-b border-white/10 bg-white/5">
        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#00F0FF] to-[#0080FF]">Proximity Chat</h2>
        <p className="text-sm text-gray-400 mt-1">
          Connected with {connectedUsers.length} player(s) nearby
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, idx) => {
          const isMe = m.senderId === currentUserId;
          return (
            <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <span className="text-[10px] text-gray-500 mb-1 px-1">
                {isMe ? "You" : m.senderId.substring(0, 5)}
              </span>
              <div
                className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm shadow-sm ${
                  isMe 
                    ? "bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/20 rounded-tr-sm" 
                    : "bg-white/10 text-white border border-white/5 rounded-tl-sm"
                }`}
              >
                {m.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-white/10 bg-black/20">
        <div className="flex bg-black/40 border border-white/10 rounded-full overflow-hidden focus-within:border-[#00F0FF]/50 transition-colors">
          <input
            type="text"
            className="flex-1 bg-transparent px-4 py-3 text-sm outline-none placeholder-gray-500"
            placeholder="Type a message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button
            type="submit"
            className="px-4 text-[#00F0FF] hover:bg-[#00F0FF]/20 transition-colors font-medium flex items-center justify-center cursor-pointer"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
