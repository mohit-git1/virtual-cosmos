import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import socket from "./socket";
import { isInProximity } from "./utils/Distance";

function Cosmos({ onProximityChange }) {
  const canvasRef = useRef(null);
  const playersRef = useRef({});
  const appRef = useRef(null);
  const keysRef = useRef({});
  const myPlayerIdRef = useRef(null);

  // Constants
  const SPEED = 4; // pixels per frame

  useEffect(() => {
    let app;
    let mapContainer;
    let proximityRoom = null;
    let lastEmitTime = 0;

    const initPixi = async () => {
      app = new PIXI.Application();
      await app.init({
        width: 1200,
        height: 800,
        backgroundColor: 0x11141C,
        antialias: true,
      });

      appRef.current = app;
      if (canvasRef.current && canvasRef.current.children.length === 0) {
          canvasRef.current.appendChild(app.canvas);
      }

      // Draw Grid Background for spatial awareness
      const grid = new PIXI.Graphics();
      grid.lineStyle(1, 0xFFFFFF, 0.05);
      for(let i=0; i<1200; i+=50) { grid.moveTo(i, 0); grid.lineTo(i, 800); }
      for(let j=0; j<800; j+=50) { grid.moveTo(0, j); grid.lineTo(1200, j); }
      app.stage.addChild(grid);

      mapContainer = new PIXI.Container();
      app.stage.addChild(mapContainer);

      const connectionLayer = new PIXI.Graphics();
      app.stage.addChild(connectionLayer);

      setupSocketListeners();
      setupKeyboard();
      
      // Setup Game Loop
      app.ticker.add((time) => {
        updateMovement();
        interpolateRemotePlayers();
        checkProximity(connectionLayer);
      });
    };

    const drawPlayer = (playerData, isMe) => {
      const g = new PIXI.Graphics();
      const color = isMe ? 0x00F0FF : 0xAA3BFF;
      
      // Draw smooth circle
      g.beginFill(color);
      g.drawCircle(0, 0, 16);
      g.endFill();
      
      // Give local player a little glow
      if(isMe){
        const glow = new PIXI.Graphics();
        glow.beginFill(0x00F0FF, 0.2);
        glow.drawCircle(0,0,24);
        glow.endFill();
        g.addChildAt(glow, 0);
      } else {
        // Outline for remotes
        g.lineStyle(2, 0xFFFFFF, 0.5);
        g.drawCircle(0,0,16);
      }
      
      // Attach target data for interpolation
      g.x = playerData.x;
      g.y = playerData.y;
      g.targetX = playerData.x;
      g.targetY = playerData.y;
      
      mapContainer.addChild(g);
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
          // get dist to find nearest
          const dist = Math.sqrt(Math.pow(myP.x - otherP.x, 2) + Math.pow(myP.y - otherP.y, 2));
          if(dist < nearestDist) {
            nearestDist = dist;
            nearestId = id;
          }
        }
      });

      // Simple implementation: connect to the single nearest player if in proximity
      if (nearestId) {
        const nearestP = playersRef.current[nearestId];
        
        // Draw connection line
        connectionLayer.lineStyle(2, 0x00F0FF, 0.6);
        connectionLayer.moveTo(myP.x, myP.y);
        connectionLayer.lineTo(nearestP.x, nearestP.y);
        
        // Create canonical room ID
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
      
      // Remove all event listeners and destroy pixi safely
      window.removeEventListener("keydown", () => {});
      window.removeEventListener("keyup", () => {});
      
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, []);

  return <div ref={canvasRef} className="w-full h-full cursor-crosshair"></div>;
}

export default Cosmos;