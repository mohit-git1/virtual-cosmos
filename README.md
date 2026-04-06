# Virtual Cosmos - Assignment

## Project Overview
Virtual Cosmos is a lightweight 2D multiplayer virtual environment where users can move around and communicate. It simulates real-world interaction by connecting users automatically to a chat room when they move near each other, and disconnecting them when they move away. It serves as a simplified, minimal implementation of proximity-based interaction platforms.

## Features Implemented
1. **Virtual World Rendering**: A simple 2D canvas rendered with PixiJS showing a grid background and distinct room zones.
2. **User Movement**: Arrow keys or WASD movement mapping allows for smooth user navigation around the 2D space within strict world boundaries.
3. **Multiplayer Synchronization**: Real-time position tracking broadcasted to all connected clients.
4. **Proximity Detection**: Proximity bubbles that detect when two players are close (less than a designated radius), highlighting a connection.
5. **Dynamic Chat System**: Automatically joining and leaving chat rooms based on position events, creating an authentic proximity-chat behavior.

## Tech Stack
- **Frontend**: React, Vite, PixiJS (Canvas Rendering), Tailwind CSS (Styling/UI), Socket.IO-Client
- **Backend**: Node.js, Express, Socket.IO

## Architecture
- **Frontend Layer**: React manages the overarching UI, including the `TopBar`, `BottomControls`, and the `ChatPanel` side drawer. The React components manage state (`isConnected`, `room`, `connectedUsers`).
- **Rendering Layer**: PixiJS is initialized inside a React container. The Pixi Application ticker updates avatar movements, connection visuals, and executes calculations on every frame.
- **Backend Layer**: A lightweight Node.js Server handles Socket.IO connections. It keeps an in-memory dictionary of users and their X/Y positions, broadcasting positional changes dynamically to all peers to keep everyone synchronized.

## Core Mechanisms Explaination

### How Proximity Detection Works
In the frontend's PixiJS tick loop (60 frames per second), the application runs a distance check between the current local player and all remote players.
The logic utilizes the standard Euclidean distance formula: `distance = sqrt((x1-x2)^2 + (y1-y2)^2)`

If the distance is less than 120 pixels, the two players are considered "in proximity". A visual connecting line is drawn on the canvas, and their IDs are sorted to create a unique chat room key (e.g., `userA-userB`). Both clients independently emit a `joinRoom` request to the backend.

### How Multiplayer Sync Works
When the frontend moves a player natively, it updates its local target variables visually and concurrently emits a `"move"` event to the server. To avoid network flooding, this emission is throttled (~20 times a second).
When the backend receives `"move"`, it updates the player's stored coordinates in server memory and broadcasts an event `"userMoved"` to all other clients. The other clients receive the new coordinates and use linear interpolation (lerp) to smoothly transition the player's on-screen avatar to the new target location.

## Setup Instructions

Make sure you have Node and NPM installed locally. 

### How to run backend
1. Open a terminal and navigate to the backend directory: `cd backend`
2. Install dependencies: `npm install`
3. Start the Socket server: `npm start` (Runs on `http://localhost:3000`)

### How to run frontend
1. Open up a second standalone terminal mapping to the frontend: `cd frontend`
2. Install dependencies: `npm install`
3. Execute the Vite React application: `npm run dev`
4. The frontend app should now be accessible at `http://localhost:5173`

You can open multiple browser windows connecting to `http://localhost:5173` to test multiplayer interactions.