import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import socket from "./socket";
import { isInProximity } from "./utils/Distance";

export default function Cosmos({ username, onProximityChange }) {
  const canvasRef = useRef(null); 
  const avatarLayerRef = useRef(null); 
  const playersRef = useRef({}); 
  const appRef = useRef(null); 
  const keysRef = useRef({}); 
  const myPlayerIdRef = useRef(null); 
  const domElementsRef = useRef({}); 

  const SPEED = 4;

  useEffect(() => {
    let app;
    let cameraContainer;
    let mapContainer;
    let connectionLayer;
    let proximityRoom = null;
    let lastEmitTime = 0;
    
    // Zoom control states
    let zoomLevel = 1.0;
    const MIN_ZOOM = 0.5;
    const MAX_ZOOM = 2.0;

    const initPixi = async () => {
      app = new PIXI.Application();
      await app.init({
        width: 1200,
        height: 800,
        backgroundColor: 0xE8D5B5,
        antialias: true,
      });

      appRef.current = app;
      
      if (canvasRef.current && canvasRef.current.children.length === 0) {
          canvasRef.current.appendChild(app.canvas);
      }

      cameraContainer = new PIXI.Container();
      app.stage.addChild(cameraContainer);

      mapContainer = new PIXI.Container();
      cameraContainer.addChild(mapContainer);

      const grid = new PIXI.Graphics();
      grid.beginFill(0x000000);
      for(let i = 0; i <= 2400; i += 60) { grid.moveTo(i, 0); grid.lineTo(i, 1600); }
      for(let j = 0; j <= 1600; j += 60) { grid.moveTo(0, j); grid.lineTo(2400, j); }
      grid.alpha = 0.05;
      mapContainer.addChild(grid);

      const roomsContainer = new PIXI.Container();
      const drawRoom = (x, y, w, h, label) => {
        const roomBg = new PIXI.Graphics();
        roomBg.rect(x, y, w, h);
        roomBg.fill({ color: 0xC2A878, alpha: 0.4});
        roomBg.stroke({ color: 0x8C714A, width: 4});
        roomsContainer.addChild(roomBg);

        const text = new PIXI.Text({ text: label, style: { fontFamily: 'sans-serif', fontSize: 18, fill: 0x5C4A31, fontWeight: 'bold' } });
        text.x = x + 16;
        text.y = y + 16;
        roomsContainer.addChild(text);
      };
      
      drawRoom(100, 100, 300, 250, "Room 1");
      drawRoom(500, 100, 300, 250, "Room 2");
      mapContainer.addChild(roomsContainer);

      connectionLayer = new PIXI.Graphics();
      mapContainer.addChild(connectionLayer);

      // Make the background interactive for click-to-move
      const hitArea = new PIXI.Graphics();
      hitArea.rect(0, 0, 2400, 1600);
      hitArea.fill({ color: 0x000000, alpha: 0 }); // invisible
      hitArea.eventMode = 'static';
      hitArea.on('pointerdown', (e) => {
        const myId = myPlayerIdRef.current;
        if (!myId || !playersRef.current[myId]) return;
        
        // Convert screen click into world target
        const worldPos = cameraContainer.toLocal(e.global);
        
        const myP = playersRef.current[myId];
        // Only register click targets inside world bounds
        myP.clickTargetX = Math.max(16, Math.min(2400 - 16, worldPos.x));
        myP.clickTargetY = Math.max(16, Math.min(1600 - 16, worldPos.y));
      });
      mapContainer.addChild(hitArea);

      setupSocketListeners();
      setupKeyboard();
      setupZoom();
      
      app.ticker.add(() => {
        updateMovement();           
        interpolateRemotePlayers(); 
        updateCameraFollow();
        checkProximity(connectionLayer); 
        updateDOMPositions();       
      });
    };

    const setupZoom = () => {
      if (app && app.canvas) {
        app.canvas.addEventListener('wheel', (e) => {
          e.preventDefault();
          const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
          zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel + zoomDelta));
          cameraContainer.scale.set(zoomLevel, zoomLevel);
        });
      }
    };

    const createDOMElement = (id, name, isMe) => {
       if (!avatarLayerRef.current) return null;
       
       const div = document.createElement('div');
       div.id = `avatar-${id}`;
       div.className = "absolute flex flex-col items-center justify-center will-change-transform z-20 pointer-events-none origin-top-left";
       
       div.innerHTML = `
         <div class="px-2 py-0.5 rounded-full bg-black/60 shadow-md flex items-center space-x-1.5 backdrop-blur-sm -translate-y-[28px] -translate-x-[50%] absolute">
           <span class="w-[6px] h-[6px] ${isMe ? 'bg-green-400' : 'bg-gray-400'} rounded-full"></span>
           <span class="text-white text-[10px] font-bold tracking-wide whitespace-nowrap">
             ${name || id.substring(0, 5)}
           </span>
         </div>
       `;
       avatarLayerRef.current.appendChild(div);
       return div;
    };

    const drawPlayer = (playerData, isMe) => {
      const g = new PIXI.Container();
      const circle = new PIXI.Graphics();
      const color = isMe ? 0x00F0FF : 0x4CAF50;
      
      circle.circle(0, 0, 12);
      circle.fill({ color: color });
      
      if(isMe){
        const glow = new PIXI.Graphics();
        glow.circle(0, 0, 24);
        glow.fill({ color: 0x00F0FF, alpha: 0.2});
        g.addChildAt(glow, 0);
      } else {
        circle.stroke({ color: 0xFFFFFF, width: 2, alpha: 0.8});
      }
      
      const shadow = new PIXI.Graphics();
      shadow.ellipse(0, 16, 12, 4);
      shadow.fill({ color: 0x000000, alpha: 0.2});
      g.addChildAt(shadow, 0);
      g.addChild(circle);
      
      g.x = playerData.x;
      g.y = playerData.y;
      g.targetX = playerData.x;
      g.targetY = playerData.y;
      g.clickTargetX = null;
      g.clickTargetY = null;
      g.name = playerData.name;
      
      mapContainer.addChild(g);
      
      const domEl = createDOMElement(playerData.id || myPlayerIdRef.current, isMe ? "You" : playerData.name, isMe);
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
            playersRef.current[id] = drawPlayer(users[id], id === myPlayerIdRef.current);
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

      // Emit join after attaching listeners to prevent missing initial spawn callback
      socket.emit("joinSpace", username);
    };

    const setupKeyboard = () => {
      window.addEventListener("keydown", (e) => { 
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea') return; // block WASD if typing
        
        keysRef.current[e.key.toLowerCase()] = true; 
        // Break out of click-targeting if manually stepping
        const myId = myPlayerIdRef.current;
        if (myId && playersRef.current[myId]) {
           playersRef.current[myId].clickTargetX = null;
           playersRef.current[myId].clickTargetY = null;
        }
      });
      window.addEventListener("keyup", (e) => { 
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;
        keysRef.current[e.key.toLowerCase()] = false; 
      });
    };

    const updateMovement = () => {
      const myId = myPlayerIdRef.current;
      if (!myId || !playersRef.current[myId]) return;

      const myP = playersRef.current[myId];
      let moved = false;

      // Click to move logic overrides keyboard until keyboard interrupts
      if (myP.clickTargetX !== null && myP.clickTargetY !== null) {
         const dx = myP.clickTargetX - myP.x;
         const dy = myP.clickTargetY - myP.y;
         const distance = Math.sqrt(dx * dx + dy * dy);
         if (distance > SPEED) {
            myP.x += (dx / distance) * SPEED;
            myP.y += (dy / distance) * SPEED;
            moved = true;
         } else {
            myP.x = myP.clickTargetX;
            myP.y = myP.clickTargetY;
            myP.clickTargetX = null;
            myP.clickTargetY = null;
         }
      } else {
        if (keysRef.current["w"] || keysRef.current["arrowup"]) { myP.y -= SPEED; moved = true; }
        if (keysRef.current["s"] || keysRef.current["arrowdown"]) { myP.y += SPEED; moved = true; }
        if (keysRef.current["a"] || keysRef.current["arrowleft"]) { myP.x -= SPEED; moved = true; }
        if (keysRef.current["d"] || keysRef.current["arrowright"]) { myP.x += SPEED; moved = true; }
      }

      myP.x = Math.max(16, Math.min(2400 - 16, myP.x));
      myP.y = Math.max(16, Math.min(1600 - 16, myP.y));

      if (moved) {
        myP.targetX = myP.x;
        myP.targetY = myP.y;
        
        const now = Date.now();
        if (now - lastEmitTime > 50) {
          socket.emit("move", { x: myP.x, y: myP.y });
          console.log("move event", { x: myP.x, y: myP.y });
          lastEmitTime = now;
        }
      }
    };

    const updateCameraFollow = () => {
      const myId = myPlayerIdRef.current;
      if (!myId || !playersRef.current[myId] || !cameraContainer) return;
      
      const myP = playersRef.current[myId];
      const targetX = 600 - myP.x * zoomLevel;
      const targetY = 400 - myP.y * zoomLevel;
      cameraContainer.x += (targetX - cameraContainer.x) * 0.08;
      cameraContainer.y += (targetY - cameraContainer.y) * 0.08;
    };

    const interpolateRemotePlayers = () => {
      Object.keys(playersRef.current).forEach(id => {
        if (id === myPlayerIdRef.current) return;
        const p = playersRef.current[id];
        p.x += (p.targetX - p.x) * 0.15;
        p.y += (p.targetY - p.y) * 0.15;
      });
    };

    const updateDOMPositions = () => {
      if(!cameraContainer) return;

      Object.keys(playersRef.current).forEach(id => {
        const p = playersRef.current[id];
        const domEl = domElementsRef.current[id];
        if (domEl) {
          // Sync dom with camera scale + camera pan offsets
          const screenX = cameraContainer.x + p.x * zoomLevel;
          const screenY = cameraContainer.y + p.y * zoomLevel;
          domEl.style.transform = `translate(${screenX}px, ${screenY}px) scale(${zoomLevel})`;
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
        
        const dist = Math.sqrt(Math.pow(myP.x - otherP.x, 2) + Math.pow(myP.y - otherP.y, 2));
        if(dist < 150) {
          if(dist < nearestDist) {
            nearestDist = dist;
            nearestId = id;
          }
        }
      });

      if (nearestId) {
        const nearestP = playersRef.current[nearestId];
        connectionLayer.moveTo(myP.x, myP.y);
        connectionLayer.lineTo(nearestP.x, nearestP.y);
        connectionLayer.stroke({ color: 0xFFFFFF, width: 2, alpha: 0.4});
        
        connectionLayer.circle(myP.x, myP.y, 100);
        connectionLayer.circle(nearestP.x, nearestP.y, 100);
        connectionLayer.fill({ color: 0xFFFFFF, alpha: 0.1});
        
        const roomName = [myId, nearestId].sort().join("-");
        if (roomName !== proximityRoom) {
          if (proximityRoom !== null) {
             socket.emit("leaveRoom", proximityRoom);
             const oldOtherId = proximityRoom.replace(myId, "").replace("-", "");
             socket.emit("proximity:leave", oldOtherId);
          }
          proximityRoom = roomName;
          socket.emit("joinRoom", proximityRoom);
          socket.emit("proximity:enter", nearestId);
          console.log(`History requested for: ${nearestP.name}`);
          socket.emit("chat:history:request", { withId: nearestId, withName: nearestP.name });
          
          socket.once("chat:history:response", (msgs) => {
            console.log(`History received on frontend: ${msgs.length} messages`);
            onProximityChange(true, [{ id: nearestId, name: nearestP.name }], msgs);
          });
          
          console.log("Joined proximity room", proximityRoom);
        }
      } else {
        if (proximityRoom !== null) {
          socket.emit("leaveRoom", proximityRoom);
          // We don't have the explicit nearestId cached securely from leave, but we can reconstruct or drop the room
          // Wait, we need to pass the other id to proximity:leave. Let's parse it from roomName:
          const otherId = proximityRoom.replace(myId, "").replace("-", "");
          socket.emit("proximity:leave", otherId);
          console.log("Left proximity room", proximityRoom);
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
      if(appRef.current && appRef.current.canvas) {
         appRef.current.canvas.removeEventListener("wheel", () => {});
      }
      
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, [username]);

  return (
    <div className="relative w-[1200px] h-[800px] rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-white/10 m-8">
      <div ref={canvasRef} className="absolute inset-0 z-0"></div>
      <div ref={avatarLayerRef} className="avatar-layer absolute inset-0 z-10 pointer-events-none"></div>
    </div>
  );
}