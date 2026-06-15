import { createBrowserRouter } from "react-router";
import Login from "../pages/login";
import Home from "../pages/home";
import NotFound from "../pages/not-found";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/home",
    element: <Home />,
  },
  {
    path: "/not-found",
    element: <NotFound />,
  },
]);
