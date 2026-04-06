import React from 'react';

export default function BottomControls() {
  const iconClass = "w-6 h-6 text-gray-300 group-hover:text-white mb-1 transition-colors";
  const btnClass = "group flex flex-col items-center justify-center p-2 rounded-xl hover:bg-white/10 transition-all cursor-pointer min-w-[64px]";
  
  return (
    <div className="control-bar h-[76px] bg-[#1A1D24] border-t border-white/10 flex items-center justify-center space-x-6 z-50 relative bottom-0 w-full shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
      <button className={btnClass}>
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
        <span className="text-[11px] text-gray-400 group-hover:text-white font-medium">Invite</span>
      </button>
      
      <button className={btnClass}>
        <div className="relative mb-1">
          <svg className="w-6 h-6 text-gray-300 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-[#1A1D24]"></div>
        </div>
        <span className="text-[11px] text-gray-400 group-hover:text-white font-medium">Record</span>
      </button>

      <div className="w-px h-8 bg-white/10 mx-2"></div>
      
      <button className={btnClass}>
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
        <span className="text-[11px] text-gray-400 group-hover:text-white font-medium">Build</span>
      </button>

      <button className={btnClass}>
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" /></svg>
        <span className="text-[11px] text-gray-400 group-hover:text-white font-medium">Hand</span>
      </button>

      <button className={btnClass}>
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <span className="text-[11px] text-gray-400 group-hover:text-white font-medium">React</span>
      </button>

      <div className="w-px h-8 bg-white/10 mx-2"></div>

      <button className={btnClass}>
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
        <span className="text-[11px] text-gray-400 group-hover:text-white font-medium">Chat</span>
      </button>

      <button className={btnClass}>
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
        <span className="text-[11px] text-gray-400 group-hover:text-white font-medium">Apps</span>
      </button>
    </div>
  );
}
