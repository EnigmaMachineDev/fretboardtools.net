import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/cinzel/400.css'
import '@fontsource/cinzel/600.css'
import '@fontsource/cinzel/700.css'
import '@fontsource/inter/300.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import { SITE_NAME } from './config/site'
import './index.css'

// Title comes from the single SITE_NAME constant, so a rename is one line.
document.title = SITE_NAME

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="min-h-screen flex items-center justify-center">
      <h1 className="text-2xl text-brand-bright">{SITE_NAME}</h1>
    </div>
  </React.StrictMode>,
)
