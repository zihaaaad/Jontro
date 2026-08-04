import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LicenseProvider } from './lib/license/LicenseContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LicenseProvider>
      <App />
    </LicenseProvider>
  </StrictMode>,
)
