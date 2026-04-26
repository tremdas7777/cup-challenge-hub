import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Bloquear clique direito
document.addEventListener('contextmenu', (e) => e.preventDefault());

// Bloquear F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
document.addEventListener('keydown', (e) => {
  if (
    e.key === 'F12' ||
    (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
    (e.ctrlKey && e.key === 'u')
  ) {
    e.preventDefault();
  }
});

// Bloquear arrastar elementos
document.addEventListener('dragstart', (e) => e.preventDefault());

createRoot(document.getElementById("root")!).render(<App />);
