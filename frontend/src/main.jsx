import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { StudioProvider } from './services/useStudio.jsx';

createRoot(document.getElementById('root')).render(
  <StudioProvider>
    <App />
  </StudioProvider>
);
