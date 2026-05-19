import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'hsl(220 18% 10%)',
            color: 'hsl(0 0% 98%)',
            border: '1px solid hsl(220 15% 20%)',
            borderRadius: '0.75rem',
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
)
