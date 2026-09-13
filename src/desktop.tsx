import { createRoot } from "react-dom/client";
import {
  createRootRoute,
  createRoute,
  createRouter,
  createMemoryHistory,
  RouterProvider,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Dashboard } from "./components/dashboard";
import "./styles.css";

const root = createRootRoute();
const index = createRoute({ getParentRoute: () => root, path: "/", component: Dashboard });
const router = createRouter({
  routeTree: root.addChildren([index]),
  history: createMemoryHistory({ initialEntries: ["/"] }),
});
const client = new QueryClient();
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={client}>
    <RouterProvider router={router} />
  </QueryClientProvider>,
);
