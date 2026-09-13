import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.jsx'

window.__dbg = window.__dbg || [];
const _origPause = HTMLMediaElement.prototype.pause;
HTMLMediaElement.prototype.pause = function (...args) {
  window.__dbg.push({ t: performance.now(), fn: "HTMLMediaElement.pause() DIRECT", stack: new Error().stack });
  return _origPause.apply(this, args);
};
const _origLoad = HTMLMediaElement.prototype.load;
HTMLMediaElement.prototype.load = function (...args) {
  window.__dbg.push({ t: performance.now(), fn: "HTMLMediaElement.load() DIRECT", stack: new Error().stack });
  return _origLoad.apply(this, args);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
)
