import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './lib/i18n.ts';
import './index.css'
import App from './App.tsx'
import ClickSpark from './components/ClickSpark.tsx';
import { AuthProvider } from './store/AuthContext/AuthContext.tsx';
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClickSpark
      sparkColor="#000000"
      sparkSize={10}
      sparkRadius={15}
      sparkCount={8}
      duration={400}
    >
      <AuthProvider>
        <App />
      </AuthProvider>
    </ClickSpark>
  </StrictMode>,
);
