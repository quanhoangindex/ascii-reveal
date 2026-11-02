import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Home from './home/Home';
import './home/home.css';
import './home/cards.css';

// wait for webfonts so glyph positions are measured against the final font
const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
const ready = fonts ? Promise.race([fonts.ready, new Promise((r) => setTimeout(r, 800))]) : Promise.resolve();

ready.then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Home />
    </StrictMode>,
  );
});
