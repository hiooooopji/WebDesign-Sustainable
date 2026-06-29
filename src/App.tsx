import { BrowserRouter, Routes, Route } from "react-router-dom";
import Globe from "./globe";
import ExploreWorld from "./ExploreWorld";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Globe />} />
        <Route path="/explore-world" element={<ExploreWorld />} />
      </Routes>
    </BrowserRouter>
  );
}
