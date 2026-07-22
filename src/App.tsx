import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ExploreWorld from "./ExploreWorld";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ExploreWorld />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
