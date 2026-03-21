import { Routes, Route } from "react-router-dom";

import HomePage from "./pages/home/page";
import DefaultLayout from "./layouts/default-layout";
import { siteConfig } from "./config/site-config";
import EtsyPDFPage from "./pages/etsy-pdf/page";
import EtstPDFLayout from "./pages/etsy-pdf/layouts/etst-pdf-layout";

export default function App() {
  return (
    <Routes>
      <Route element={<DefaultLayout />}>
        <Route index path={siteConfig.routes.home} element={<HomePage />} />
      </Route>

      <Route element={<EtstPDFLayout />}>
        <Route path={siteConfig.routes.etsyPdf} element={<EtsyPDFPage />} />
      </Route>
    </Routes>
  );
}
