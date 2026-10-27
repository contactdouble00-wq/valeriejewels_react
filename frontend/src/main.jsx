import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initBrandSchema } from './utils/seo';

// Initialize Brand & Organization Schema.org structured data (Instagram, Amazon, Store info)
initBrandSchema();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

