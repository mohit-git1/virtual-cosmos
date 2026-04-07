import React, { useState, useEffect } from 'react';
import socket from '../socket';

export default function TopBar() {
  const [counts, setCounts] = useState({ current: 1, max: 50 });

  useEffect(() => {
    const onCount = (data) => setCounts(data);
    socket.on('room:count', onCount);
    return () => socket.off('room:count', onCount);
  }, []);

  return (
    <div className="topbar h-14 bg-[#1A1D24] border-b border-white/10 flex items-center justify-between px-4 text-white z-50 relative">
      <div className="flex items-center space-x-4">
        <div className="font-semibold text-sm bg-white/10 px-3 py-1.5 rounded-lg border border-white/5 shadow-sm flex items-center">
          <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          Virtual Cosmos Base
        </div>
        <div className="flex items-center bg-green-500/10 text-green-400 px-3 py-1.5 rounded-lg border border-green-500/20 text-sm font-medium">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
          Live Call
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="flex items-center text-sm text-gray-300 font-medium bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          <span className="participant-count-placeholder">{counts.current}/{counts.max}</span>
        </div>
        <button className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/5">
          <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </button>
      </div>
    </div>
  );
}
