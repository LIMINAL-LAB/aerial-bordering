import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import NavigationBar from "./components/NavigationBar";
import HomePage from "./components/HomePage";
const ReportPage = lazy(() => import("./components/ReportPage"));
const DatabasePage = lazy(() => import("./components/DatabasePage"));
const MethodologyPage = lazy(() => import("./components/MethodologyPage"));
import PageTransition from "./components/PageTransition";
import "./App.css";

function App() {
  return (
    <Router>
      <div className="app">
        <NavigationBar />
        <PageTransition>
          {(loc) => (
            <Suspense fallback={null}>
            <Routes location={loc}>
              <Route path="/" element={<HomePage />} />
              <Route path="/report" element={<ReportPage />} />
              <Route path="/database" element={<DatabasePage />} />
              <Route path="/methodology" element={<MethodologyPage />} />
            </Routes>
            </Suspense>
          )}
        </PageTransition>
      </div>
    </Router>
  );
}

export default App;
