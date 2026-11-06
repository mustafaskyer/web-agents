import type { RouteObject } from "react-router";
import { Category } from "./pages/Category";
import { Checkout } from "./pages/Checkout";
import { Home } from "./pages/Home";
import { NotFound } from "./pages/NotFound";
import { OrderConfirmed } from "./pages/OrderConfirmed";
import { Product } from "./pages/Product";
import { Products } from "./pages/Products";
import { Root } from "./Root";

export const routes: RouteObject[] = [
  {
    element: <Root />,
    children: [
      {
        errorElement: <NotFound />,
        children: [
          { index: true, element: <Home /> },
          { path: "products", element: <Products /> },
          { path: "category/:slug", element: <Category /> },
          { path: "product/:slug", element: <Product /> },
          { path: "checkout", element: <Checkout /> },
          { path: "order/:id", element: <OrderConfirmed /> },
          { path: "*", element: <NotFound /> },
        ],
      },
    ],
  },
];
