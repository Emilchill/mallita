import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the root workspace directory
app.use(express.static(__dirname));

// Custom healthcheck route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Endpoint to serve Firebase config securely without hardcoding in frontend files
app.get("/api/firebase-config", (req, res) => {
  res.json({
    apiKey: process.env.FIREBASE_API_KEY || "AIzaSyDYUFGIjFkEAYACGD2l8Rzoo1x4Qcd5KhE",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "malla-curricular-38175.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "malla-curricular-38175",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "malla-curricular-38175.firebasestorage.app",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "1010936934232",
    appId: process.env.FIREBASE_APP_ID || "1:1010936934232:web:5a6f313b80f9c879e47f2d"
  });
});

// Serve index.html for root path or handle routes manually if needed
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});
