/**
 * main.tsx — Application entry point.
 *
 * Mounts the React app into the #root div defined in index.html.
 * Global CSS is imported here so it's available to all components.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
