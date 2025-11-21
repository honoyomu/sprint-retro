import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { InsforgeProvider } from '@insforge/react';
import './index.css';
import App from './App.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

createRoot(rootElement).render(
  <StrictMode>
    <InsforgeProvider
      baseUrl={
        import.meta.env.VITE_INSFORGE_BASE_URL || 'https://kh2b392k.us-east.insforge.app'
      }
    >
      <App />
    </InsforgeProvider>
  </StrictMode>
);
