import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import '@fontsource/cinzel/400.css'
import '@fontsource/cinzel/600.css'
import '@fontsource/cinzel/700.css'
import '@fontsource/inter/300.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import { SITE_NAME } from './config/site'
import Layout from './components/Layout'
import ChordFinder from './pages/ChordFinder'
import Identify from './pages/Identify'
import ScaleFinder from './pages/ScaleFinder'
import Library from './pages/Library'
import About from './pages/About'
import NotFound from './pages/NotFound'
import './index.css'

// Title comes from the single SITE_NAME constant, so a rename is one line.
document.title = SITE_NAME

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<ChordFinder />} />
          <Route path="/identify" element={<Identify />} />
          <Route path="/scales" element={<ScaleFinder />} />
          <Route path="/library" element={<Library />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
