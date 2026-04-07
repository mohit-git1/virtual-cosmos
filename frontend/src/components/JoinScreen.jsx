import { useState } from "react";

export default function JoinScreen({ onJoin }) {
  const [name, setName] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onJoin(name.trim());
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0B0E14] z-50">
      <div className="bg-[#1A1D24] p-8 rounded-2xl shadow-2xl border border-white/10 w-[400px]">
        <h1 className="text-2xl font-bold text-white text-center mb-2">Join Virtual Cosmos</h1>
        <p className="text-gray-400 text-sm text-center mb-6">Enter a username to enter the space</p>
        
        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
          <input
            type="text"
            className="w-full bg-black/40 border border-white/10 px-4 py-3 rounded-lg text-white focus:outline-none focus:border-[#00F0FF]/50 transition-colors"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full bg-gradient-to-r from-[#00F0FF] to-[#0080FF] hover:opacity-90 disabled:opacity-50 text-black font-bold py-3 rounded-lg transition-opacity"
          >
            Enter Space
          </button>
        </form>
      </div>
    </div>
  );
}
