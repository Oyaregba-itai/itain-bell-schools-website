import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Apply saved theme on first load
const savedTheme = localStorage.getItem("ibs-theme") || "light";
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const isDark = savedTheme === "dark" || (savedTheme === "system" && prefersDark);
document.documentElement.classList.toggle("dark", isDark);

// Apply saved font size
const savedFontSize = localStorage.getItem("ibs-fontsize");
if (savedFontSize) document.documentElement.style.fontSize = savedFontSize;

// Apply saved accent colour
const savedAccentHsl = localStorage.getItem("ibs-accent-hsl");
if (savedAccentHsl) {
  document.documentElement.style.setProperty("--primary", savedAccentHsl);
  document.documentElement.style.setProperty("--ring", savedAccentHsl);
}

createRoot(document.getElementById("root")!).render(<App />);
