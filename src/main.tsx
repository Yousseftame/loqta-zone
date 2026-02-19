import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ClickSpark from './components/ClickSpark.tsx';
import { AuthProvider } from './store/AuthContext/AuthContext.tsx';
import { ProductProvider } from './store/AdminContext/ProductContext/ProductsCotnext.tsx';
import { AuctionProvider } from './store/AdminContext/AuctionContext/AuctionContext.tsx';
import { VoucherProvider } from './store/AdminContext/VoucherContext/VoucherContext.tsx';

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClickSpark
      sparkColor="#000000"
      sparkSize={10}
      sparkRadius={15}
      sparkCount={8}
      duration={400}
    >
      {/* Your content here */}
      <AuthProvider>
        <ProductProvider>
          <AuctionProvider>
            <VoucherProvider>
              <App />
            </VoucherProvider>
          </AuctionProvider>
        </ProductProvider>
      </AuthProvider>
    </ClickSpark>
  </StrictMode>,
);
