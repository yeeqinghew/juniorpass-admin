import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Routers from "./router";

function App() {
  return (
    <BrowserRouter>
      <Routers />
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
