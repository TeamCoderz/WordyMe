import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { StoreProvider } from './store/provider';
import { App } from './App';

const rootElement = document.getElementById('app');
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <StoreProvider>
        <App />
      </StoreProvider>
    </StrictMode>,
  );
}
