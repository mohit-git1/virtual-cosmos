import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import socket from "./socket";
import { isInProximity } from "./utils/Distance";

export default function Cosmos({ onProximityChange }) {
  // References map to specific parts of our react setup to span across re-renders
  const canvasRef = useRef(null); 
  const avatarLayerRef = useRef(null); 
  const playersRef = useRef({}); // keep track of drawing visuals for players
  const appRef = useRef(null); 
  const keysRef = useRef({}); // keyboard movement states tracking
  const myPlayerIdRef = useRef(null); 
  const domElementsRef = useRef({}); // maintain HTML elements showing text labels

  const SPEED = 4; // Set a flat movement speed for physics loop

  useEffect(() => {
    let app;
    let mapContainer;
    let connectionLayer;
    let proximityRoom = null;
    let lastEmitTime = 0;

    // STEP 1: INITIALIZE THE PIXI CANVAS AND VIRTUAL WORLD
    const initPixi = async () => {
      app = new PIXI.Application();
      await app.init({
        width: 1200,
        height: 800,
        backgroundColor: 0xE8D5B5, // Set rendering floor color 
        antialias: true,
      });

      appRef.current = app;
      
      // Prevent attaching multiple canvases during React StrictMode load
      if (canvasRef.current && canvasRef.current.children.length === 0) {
          canvasRef.current.appendChild(app.canvas);
      }

      // Draw Grid Base (Creates physical scale and structure)
      const grid = new PIXI.Graphics();
      grid.beginFill(0x000000);
      for(let i = 0; i <= 1200; i += 60) { grid.moveTo(i, 0); grid.lineTo(i, 800); }
      for(let j = 0; j <= 800; j += 60) { grid.moveTo(0, j); grid.lineTo(1200, j); }
      // This uses PIXI stroke styles natively to set grid opacity
      grid.alpha = 0.05;
      app.stage.addChild(grid);

      // Draw Room Zones (Provide visual structure boundaries)
      const roomsContainer = new PIXI.Container();
      const drawRoom = (x, y, w, h, label) => {
        const roomBg = new PIXI.Graphics();
        
        // Use standard fill formats required in V8 PixiJS
        roomBg.rect(x, y, w, h);
        roomBg.fill({ color: 0xC2A878, alpha: 0.4});
        roomBg.stroke({ color: 0x8C714A, width: 4});
        
        roomsContainer.addChild(roomBg);

        const text = new PIXI.Text({ text: label, style: { fontFamily: 'sans-serif', fontSize: 18, fill: 0x5C4A31, fontWeight: 'bold' } });
        text.x = x + 16;
        text.y = y + 16;
        roomsContainer.addChild(text);
      };
      
      // Render sample rooms into the space
      drawRoom(100, 100, 300, 250, "Room 1");
      drawRoom(500, 100, 300, 250, "Room 2");
      app.stage.addChild(roomsContainer);

      // Create a layer specifically dedicated to player avatars moving around
      mapContainer = new PIXI.Container();
      app.stage.addChild(mapContainer);

      // Create a drawing layer for the proximity/interaction effects 
      connectionLayer = new PIXI.Graphics();
      app.stage.addChild(connectionLayer);

      // Initialize game logic handlers
      setupSocketListeners();
      setupKeyboard();
      
      // STEP 2: SETUP GAME LOOP TICKER
      // This block of code runs ~60 times a second
      app.ticker.add(() => {
        updateMovement();           // Move our character if keys are pressed
        interpolateRemotePlayers(); // Move remote characters to their target destinations smoothly
        checkProximity(connectionLayer); // Run proximity calculations to see who you are near
        updateDOMPositions();       // Sync the HTML labels (usernames) with circle positions
      });
    };

    // STEP 3: AVATAR AND ELEMENT RENDERERS
    const createDOMElement = (id, isMe) => {
       if (!avatarLayerRef.current) return null;
       
       // Creates an HTML div that holds the character label, drawn above canvas layer
       const div = document.createElement('div');
       div.id = \`avatar-\${id}\`;
       div.className = "absolute flex flex-col items-center justify-center transition-transform duration-75 will-change-transform z-20 pointer-events-none";
       
       // Center align over the graphic circle using translation trick
       div.innerHTML = \`
         <div class="px-2 py-0.5 rounded-full bg-black/60 shadow-md flex items-center space-x-1.5 backdrop-blur-sm -translate-y-[28px] -translate-x-[50%] absolute">
           <span class="w-[6px] h-[6px] \${isMe ? 'bg-green-400' : 'bg-green-400'} rounded-full"></span>
           <span class="text-white text-[10px] font-bold tracking-wide whitespace-nowrap">
             \${isMe ? 'You' : id.substring(0, 5)}
           </span>
         </div>
       \`;
       avatarLayerRef.current.appendChild(div);
       return div;
    };

    const drawPlayer = (playerData, isMe) => {
      const g = new PIXI.Graphics();
      const color = isMe ? 0x00F0FF : 0x4CAF50;
      
      // Draw simple circular avatar
      g.circle(0, 0, 12);
      g.fill({ color: color });
      
      // Apply highlights and shadows
      if(isMe){
        const glow = new PIXI.Graphics();
        glow.circle(0, 0, 24);
        glow.fill({ color: 0x00F0FF, alpha: 0.2});
        g.addChildAt(glow, 0);
      } else {
        g.stroke({ color: 0xFFFFFF, width: 2, alpha: 0.8});
      }
      
      const shadow = new PIXI.Graphics();
      shadow.ellipse(0, 16, 12, 4);
      shadow.fill({ color: 0x000000, alpha: 0.2});
      g.addChildAt(shadow, 0);
      
      // Setup the state for target interpolation
      g.x = playerData.x;
      g.y = playerData.y;
      g.targetX = playerData.x;
      g.targetY = playerData.y;
      
      mapContainer.addChild(g);
      
      // Attach the HTML label element that will float above the player
      const domEl = createDOMElement(playerData.id || myPlayerIdRef.current, isMe);
      if (domEl) {
         domElementsRef.current[playerData.id || myPlayerIdRef.current] = domEl;
      }

      return g;
    };

    // STEP 4: MULTIPLAYER SYNC
    const setupSocketListeners = () => {
      myPlayerIdRef.current = socket.id;

      // Handle receiving all currently playing users on initial join
      socket.on("currentUsers", (users) => {
        Object.keys(users).forEach((id) => {
          if (!playersRef.current[id]) {
            playersRef.current[id] = drawPlayer({ id, ...users[id] }, id === myPlayerIdRef.current);
          }
        });
      });

      // Handle another remote player freshly connecting
      socket.on("newUser", (user) => {
        if (!playersRef.current[user.id]) {
          playersRef.current[user.id] = drawPlayer(user, false);
        }
      });

      // Update character states to new requested target locations
      socket.on("userMoved", (info) => {
        if (info.id === myPlayerIdRef.current) return;
        const p = playersRef.current[info.id];
        if (p) {
          p.targetX = info.x;
          p.targetY = info.y;
        }
      });

      // Remove character data and graphics if someone leaves
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

    // STEP 5: MOVEMENT ENGINE
    const updateMovement = () => {
      // Find our own player graphic in the map
      const myId = myPlayerIdRef.current;
      if (!myId || !playersRef.current[myId]) return;

      const myP = playersRef.current[myId];
      let moved = false;

      // React to keyboard key triggers
      if (keysRef.current["w"] || keysRef.current["arrowup"]) { myP.y -= SPEED; moved = true; }
      if (keysRef.current["s"] || keysRef.current["arrowdown"]) { myP.y += SPEED; moved = true; }
      if (keysRef.current["a"] || keysRef.current["arrowleft"]) { myP.x -= SPEED; moved = true; }
      if (keysRef.current["d"] || keysRef.current["arrowright"]) { myP.x += SPEED; moved = true; }

      // Restrict character from walking out of the 1200x800 bounding box
      myP.x = Math.max(16, Math.min(1200 - 16, myP.x));
      myP.y = Math.max(16, Math.min(800 - 16, myP.y));

      // Broadcast position to other active users
      if (moved) {
        myP.targetX = myP.x;
        myP.targetY = myP.y;
        
        const now = Date.now();
        // Prevent overwhelming backend socket connection by throttling to a 50ms pulse speed
        if (now - lastEmitTime > 50) {
          socket.emit("move", { x: myP.x, y: myP.y });
          lastEmitTime = now;
        }
      }
    };

    // Calculate fluid frames between where the user clicked a boundary to walk, and where they are
    const interpolateRemotePlayers = () => {
      Object.keys(playersRef.current).forEach(id => {
        if (id === myPlayerIdRef.current) return;
        const p = playersRef.current[id];
        // Math vector linear interpolation for smoothness
        p.x += (p.targetX - p.x) * 0.15;
        p.y += (p.targetY - p.y) * 0.15;
      });
    };

    // Sync standard React HTML Dom elements relative to canvas pixel location
    const updateDOMPositions = () => {
      Object.keys(playersRef.current).forEach(id => {
        const p = playersRef.current[id];
        const domEl = domElementsRef.current[id];
        if (domEl) {
          domEl.style.transform = \`translate(\${p.x}px, \${p.y}px)\`;
        }
      });
    };

    // STEP 6: PROXIMITY DETECTION ALGORITHM
    const checkProximity = (connectionLayer) => {
      // Clear visual bubbles initially
      connectionLayer.clear();
      
      const myId = myPlayerIdRef.current;
      if (!myId || !playersRef.current[myId]) return;
      
      const myP = playersRef.current[myId];
      let nearestDist = Infinity;
      let nearestId = null;

      // Loop through all users to establish physical location distances
      Object.keys(playersRef.current).forEach(id => {
        if(id === myId) return;
        const otherP = playersRef.current[id];
        
        // We use boolean logic utilizing Pythagorean equation for exact distance checking
        if(isInProximity(myP.x, myP.y, otherP.x, otherP.y)) {
          const dist = Math.sqrt(Math.pow(myP.x - otherP.x, 2) + Math.pow(myP.y - otherP.y, 2));
          // Hook onto nearest remote physical user
          if(dist < nearestDist) {
            nearestDist = dist;
            nearestId = id;
          }
        }
      });

      // If we find a player inside our trigger boundary
      if (nearestId) {
        const nearestP = playersRef.current[nearestId];
        
        // Draw the visual link line between both objects
        connectionLayer.moveTo(myP.x, myP.y);
        connectionLayer.lineTo(nearestP.x, nearestP.y);
        connectionLayer.stroke({ color: 0xFFFFFF, width: 2, alpha: 0.4});
        
        // Draw interaction bubbles showing active proximity connections
        connectionLayer.circle(myP.x, myP.y, 100);
        connectionLayer.circle(nearestP.x, nearestP.y, 100);
        connectionLayer.fill({ color: 0xFFFFFF, alpha: 0.1});
        
        // Build the socket connection identifier utilizing ascending string sort.
        const roomName = [myId, nearestId].sort().join("-");
        
        // Ensure a chat bridge opens to trigger the side UI Panel
        if (roomName !== proximityRoom) {
          proximityRoom = roomName;
          socket.emit("joinRoom", proximityRoom);
          onProximityChange(true, [nearestId]);
        }
      // If we move away
      } else {
        if (proximityRoom !== null) {
          // Drop the bridge
          socket.emit("leaveRoom", proximityRoom);
          proximityRoom = null;
          onProximityChange(false, []);
        }
      }
    };

    initPixi();

    // STEP 7: CLEANUP ENGINE ON UNMOUNT
    return () => {
      // Disconnecting logic
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
      {/* Container holding the background map and circles */}
      <div ref={canvasRef} className="absolute inset-0 z-0"></div>
      
      {/* Container holding the player text boxes mapped physically onto the player objects */}
      <div ref={avatarLayerRef} className="avatar-layer absolute inset-0 z-10 pointer-events-none"></div>
    </div>
  );
}