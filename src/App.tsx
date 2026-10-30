import { Suspense, useEffect } from "react";
import { Route, Routes, useLocation, useParams } from "react-router";
import { RouteErrorBoundary } from "./components/RouteErrorBoundary";
import { Home } from "./pages/Home";
import { NotFound } from "./pages/NotFound";
import { findTool, lazyTool } from "./tools/registry";

export function App() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/tools/:slug" element={<ToolRoute />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function ToolRoute() {
  const { slug } = useParams();
  const tool = findTool(slug);
  if (!tool) return <NotFound />;

  const ToolComponent = lazyTool(tool);
  // Boundary di-key per slug: boundary baru selalu menampilkan skeleton selama chunk dimuat,
  // meski navigasi berjalan di dalam transition React.
  return (
    <RouteErrorBoundary key={tool.slug}>
      <Suspense key={tool.slug} fallback={<tool.Skeleton />}>
        <ToolComponent />
      </Suspense>
    </RouteErrorBoundary>
  );
}
