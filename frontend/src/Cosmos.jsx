import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import socket from "./socket";
import { isInProximity } from "./utils/Distance";

function Cosmos({ onProximityChange }) {
  const canvasRef = useRef(null);
  const avatarLayerRef = useRef(null);
  const playersRef = useRef({});
  const appRef = useRef(null);
  const keysRef = useRef({});
  const myPlayerIdRef = useRef(null);
  const domElementsRef = useRef({});

  // Constants
  const SPEED = 4; // pixels per frame

  useEffect(() => {
    let app;
    let mapContainer;
    let connectionLayer;
    let proximityRoom = null;
    let lastEmitTime = 0;

    const initPixi = async () => {
      app = new PIXI.Application();
      await app.init({
        width: 1200,
        height: 800,
        backgroundColor: 0xE8D5B5, // wood/carpet-like base color
        antialias: true,
      });

      appRef.current = app;
      if (canvasRef.current && canvasRef.current.children.length === 0) {
          canvasRef.current.appendChild(app.canvas);
      }

      // Draw Grid/Tiles Background
      const grid = new PIXI.Graphics();
      grid.lineStyle(1, 0x000000, 0.05);
      for(let i=0; i<=1200; i+=60) { grid.moveTo(i, 0); grid.lineTo(i, 800); }
      for(let j=0; j<=800; j+=60) { grid.moveTo(0, j); grid.lineTo(1200, j); }
      app.stage.addChild(grid);

      // Draw Rooms
      const roomsContainer = new PIXI.Container();
      const drawRoom = (x, y, w, h, label) => {
        const roomBg = new PIXI.Graphics();
        roomBg.beginFill(0xC2A878, 0.4);
        roomBg.lineStyle(4, 0x8C714A, 0.8);
        roomBg.drawRoundedRect(x, y, w, h, 8);
        roomBg.endFill();
        roomsContainer.addChild(roomBg);

        const text = new PIXI.Text({ text: label, style: { fontFamily: 'sans-serif', fontSize: 18, fill: 0x5C4A31, fontWeight: 'bold' } });
        text.x = x + 16;
        text.y = y + 16;
        roomsContainer.addChild(text);
      };
      
      drawRoom(100, 100, 300, 250, "Room 1");
      drawRoom(500, 100, 300, 250, "Room 2");
      app.stage.addChild(roomsContainer);

      mapContainer = new PIXI.Container();
      app.stage.addChild(mapContainer);

      connectionLayer = new PIXI.Graphics();
      app.stage.addChild(connectionLayer);

      setupSocketListeners();
      setupKeyboard();
      
      // Setup Game Loop
      app.ticker.add(() => {
        updateMovement();
        interpolateRemotePlayers();
        checkProximity(connectionLayer);
        updateDOMPositions();
      });
    };

    const createDOMElement = (id, isMe) => {
       if (!avatarLayerRef.current) return null;
       const div = document.createElement('div');
       div.id = `avatar-${id}`;
       div.className = "absolute flex flex-col items-center justify-center transition-transform duration-75 will-change-transform z-20 pointer-events-none";
       // We center it around the coordinate: -50% -100% basically to put it centered horizontally and above the circle physically
       div.innerHTML = `
         <div class="px-2 py-0.5 rounded-full bg-black/60 shadow-md flex items-center space-x-1.5 backdrop-blur-sm -translate-y-[28px] -translate-x-[50%] absolute">
           <span class="w-[6px] h-[6px] ${isMe ? 'bg-green-400' : 'bg-green-400'} rounded-full"></span>
           <span class="text-white text-[10px] font-bold tracking-wide whitespace-nowrap">
             ${isMe ? 'You' : id.substring(0, 5)}
           </span>
         </div>
       `;
       avatarLayerRef.current.appendChild(div);
       return div;
    };

    const drawPlayer = (playerData, isMe) => {
      const g = new PIXI.Graphics();
      // Circle instead of sprite based on core constraints
      const color = isMe ? 0x00F0FF : 0x4CAF50;
      
      g.beginFill(color);
      g.drawCircle(0, 0, 12); // Slightly smaller circle
      g.endFill();
      
      // Give local player a little glow
      if(isMe){
        const glow = new PIXI.Graphics();
        glow.beginFill(0x00F0FF, 0.2);
        glow.drawCircle(0,0,24);
        glow.endFill();
        g.addChildAt(glow, 0);
      } else {
        g.lineStyle(2, 0xFFFFFF, 0.8);
        g.drawCircle(0,0,12);
      }
      
      // Shadow
      const shadow = new PIXI.Graphics();
      shadow.beginFill(0x000000, 0.2);
      shadow.drawEllipse(0, 16, 12, 4);
      shadow.endFill();
      g.addChildAt(shadow, 0);
      
      g.x = playerData.x;
      g.y = playerData.y;
      g.targetX = playerData.x;
      g.targetY = playerData.y;
      
      mapContainer.addChild(g);
      
      // Create corresponding DOM label
      const domEl = createDOMElement(playerData.id || myPlayerIdRef.current, isMe);
      if (domEl) {
         domElementsRef.current[playerData.id || myPlayerIdRef.current] = domEl;
      }

      return g;
    };

    const setupSocketListeners = () => {
      myPlayerIdRef.current = socket.id;

      socket.on("currentUsers", (users) => {
        Object.keys(users).forEach((id) => {
          if (!playersRef.current[id]) {
            playersRef.current[id] = drawPlayer({ id, ...users[id] }, id === myPlayerIdRef.current);
          }
        });
      });

      socket.on("newUser", (user) => {
        if (!playersRef.current[user.id]) {
          playersRef.current[user.id] = drawPlayer(user, false);
        }
      });

      socket.on("userMoved", (info) => {
        if (info.id === myPlayerIdRef.current) return;
        const p = playersRef.current[info.id];
        if (p) {
          p.targetX = info.x;
          p.targetY = info.y;
        }
      });

      socket.on("userDisconnected", (id) => {
        if (playersRef.current[id]) {
          mapContainer.removeChild(playersRef.current[id]);
          playersRef.current[id].destroy();
          delete playersRef.current[id];
        }
        if (domElementsRef.current[id]) {
          domElementsRef.current[id].remove();
          delete domElementsRef.current[id];
        }
      });
    };

    const setupKeyboard = () => {
      window.addEventListener("keydown", (e) => { keysRef.current[e.key.toLowerCase()] = true; });
      window.addEventListener("keyup", (e) => { keysRef.current[e.key.toLowerCase()] = false; });
    };

    const updateMovement = () => {
      const myId = myPlayerIdRef.current;
      if (!myId || !playersRef.current[myId]) return;

      const myP = playersRef.current[myId];
      let moved = false;

      if (keysRef.current["w"] || keysRef.current["arrowup"]) { myP.y -= SPEED; moved = true; }
      if (keysRef.current["s"] || keysRef.current["arrowdown"]) { myP.y += SPEED; moved = true; }
      if (keysRef.current["a"] || keysRef.current["arrowleft"]) { myP.x -= SPEED; moved = true; }
      if (keysRef.current["d"] || keysRef.current["arrowright"]) { myP.x += SPEED; moved = true; }

      // Boundaries
      myP.x = Math.max(16, Math.min(1200 - 16, myP.x));
      myP.y = Math.max(16, Math.min(800 - 16, myP.y));

      if (moved) {
        myP.targetX = myP.x;
        myP.targetY = myP.y;
        
        // Throttle emissions (~20fps max = every 50ms)
        const now = Date.now();
        if (now - lastEmitTime > 50) {
          socket.emit("move", { x: myP.x, y: myP.y });
          lastEmitTime = now;
        }
      }
    };

    const interpolateRemotePlayers = () => {
      Object.keys(playersRef.current).forEach(id => {
        if (id === myPlayerIdRef.current) return;
        const p = playersRef.current[id];
        // simple lerp
        p.x += (p.targetX - p.x) * 0.15;
        p.y += (p.targetY - p.y) * 0.15;
      });
    };

    const updateDOMPositions = () => {
      Object.keys(playersRef.current).forEach(id => {
        const p = playersRef.current[id];
        const domEl = domElementsRef.current[id];
        if (domEl) {
          domEl.style.transform = `translate(${p.x}px, ${p.y}px)`;
        }
      });
    };

    const checkProximity = (connectionLayer) => {
      connectionLayer.clear();
      
      const myId = myPlayerIdRef.current;
      if (!myId || !playersRef.current[myId]) return;
      
      const myP = playersRef.current[myId];
      let nearestDist = Infinity;
      let nearestId = null;

      Object.keys(playersRef.current).forEach(id => {
        if(id === myId) return;
        const otherP = playersRef.current[id];
        if(isInProximity(myP.x, myP.y, otherP.x, otherP.y)) {
          const dist = Math.sqrt(Math.pow(myP.x - otherP.x, 2) + Math.pow(myP.y - otherP.y, 2));
          if(dist < nearestDist) {
            nearestDist = dist;
            nearestId = id;
          }
        }
      });

      if (nearestId) {
        const nearestP = playersRef.current[nearestId];
        
        // Draw connection line
        connectionLayer.lineStyle(2, 0xFFFFFF, 0.4);
        connectionLayer.moveTo(myP.x, myP.y);
        connectionLayer.lineTo(nearestP.x, nearestP.y);
        
        // Highlight circle around both
        connectionLayer.beginFill(0xFFFFFF, 0.1);
        connectionLayer.drawCircle(myP.x, myP.y, 100);
        connectionLayer.drawCircle(nearestP.x, nearestP.y, 100);
        connectionLayer.endFill();
        
        const roomName = [myId, nearestId].sort().join("-");
        if (roomName !== proximityRoom) {
          proximityRoom = roomName;
          socket.emit("joinRoom", proximityRoom);
          onProximityChange(true, [nearestId]);
        }
      } else {
        if (proximityRoom !== null) {
          socket.emit("leaveRoom", proximityRoom);
          proximityRoom = null;
          onProximityChange(false, []);
        }
      }
    };

    initPixi();

    return () => {
      socket.off("currentUsers");
      socket.off("newUser");
      socket.off("userMoved");
      socket.off("userDisconnected");
      
      window.removeEventListener("keydown", () => {});
      window.removeEventListener("keyup", () => {});
      
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-[1200px] h-[800px] rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-white/10 m-8">
      <div ref={canvasRef} className="absolute inset-0 z-0"></div>
      <div ref={avatarLayerRef} className="avatar-layer absolute inset-0 z-10 pointer-events-none"></div>
    </div>
  );
}

export default Cosmos;