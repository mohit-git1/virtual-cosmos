import { io } from "socket.io-client";

const URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
const socket = io(URL, { autoConnect: false });

export default socket;