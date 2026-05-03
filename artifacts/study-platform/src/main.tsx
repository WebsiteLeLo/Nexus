import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Data version migration — bump this number to reset all user data on next load
const DATA_VERSION = "2";
const VERSION_KEY = "nexus-data-version";

if (localStorage.getItem(VERSION_KEY) !== DATA_VERSION) {
  const nexusKeys = Object.keys(localStorage).filter(k => k.startsWith("nexus-"));
  nexusKeys.forEach(k => localStorage.removeItem(k));
  localStorage.setItem(VERSION_KEY, DATA_VERSION);
}

createRoot(document.getElementById("root")!).render(<App />);
