import { Routes, Route } from "react-router-dom";

import HomePage from "./pages/home";
import DefaultLayout from "./layouts/default-layout";

export default function App() {
  return (
    <Routes>
      <Route element={<DefaultLayout />}>
        <Route index element={<HomePage />} />
      </Route>
    </Routes>
  );
}
