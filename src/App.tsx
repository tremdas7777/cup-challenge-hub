import { BrowserRouter, Route, Routes } from "react-router-dom";
import QuizPremiado from "./pages/QuizPremiado";
import NotFound from "./pages/NotFound";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<QuizPremiado />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

export default App;
