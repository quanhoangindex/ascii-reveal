import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Home from './home/Home';
import ComponentPage from './docs/ComponentPage';
import { useRoute } from './site/shared';
import './home/home.css';
import './home/cards.css';
import './docs/docs.css';

// "#/components/<slug>" opens a component page; anything else is the homepage (its own #anchors keep working)
function App() {
  const route = useRoute();
  return route.page === 'component' ? <ComponentPage key={route.slug} slug={route.slug} /> : <Home />;
}

// wait for webfonts so glyph positions are measured against the final font
const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
const ready = fonts ? Promise.race([fonts.ready, new Promise((r) => setTimeout(r, 800))]) : Promise.resolve();

ready.then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
