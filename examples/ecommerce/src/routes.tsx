import type { RouteObject } from "react-router";
import { Category } from "./pages/category";
import { Checkout } from "./pages/checkout";
import { Home } from "./pages/home";
import { NotFound } from "./pages/not-found";
import { OrderConfirmed } from "./pages/order-confirmed";
import { Product } from "./pages/product";
import { Products } from "./pages/products";
import { Root } from "./root";

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
