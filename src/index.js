import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./Views/Pages/App";
import { Provider } from "react-redux";
import "./tokens.css";
import "./assets/fonts/maidmatch/maidmatch-fonts.css";
import "./assets/css/mamaadmin.css";
import "./print.css";
import "./components/ui/select-kit.css";
import 'react-datepicker/dist/react-datepicker.css';
import { persistor, store } from "./redux/store";
import { PersistGate } from "redux-persist/integration/react";
import { PaddingProvider } from "./components/padding-provider/PaddingProvider";
import './i18n.js';
import { I18nProvider } from "./i18n/I18nProvider";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes (data stays fresh for 5 mins)
      cacheTime: 1000 * 60 * 10, // 10 minutes (cache duration)
      retry: 1, // Retry failed requests once
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <Provider store={ store }>
    <PersistGate loading={ null } persistor={ persistor }>
      <BrowserRouter>
        <HelmetProvider>
          <PaddingProvider>
            <QueryClientProvider client={ queryClient }>
              <ErrorBoundary captureGlobal>
                <I18nProvider>
                  <App />
                </I18nProvider>
              </ErrorBoundary>
            </QueryClientProvider>
          </PaddingProvider>
        </HelmetProvider>
      </BrowserRouter>
    </PersistGate>
  </Provider>
);
