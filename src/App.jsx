import React from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";
import SiteNav from "./components/SiteNav.jsx";
import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import PlayHubPage from "./pages/PlayHubPage.jsx";
import SimplePage from "./pages/SimplePage.jsx";
import SectionPage from "./pages/SectionPage.jsx";

function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  return (
    <div>
      <SiteNav
        user={user}
        loading={loading}
        onOpenPlayHub={() => navigate("/playhub")}
      />
      <main className="container">
        <Outlet />
      </main>
    </div>
  );
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="card">Checking session…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="login" element={<LoginPage />} />

            <Route path="culture" element={<SimplePage title="Culture" />} />
            <Route path="new-players-guide" element={<SimplePage title="New Player’s Guide" />} />
            <Route path="register" element={<SimplePage title="Register" />} />

            <Route path="current-season/*" element={<SectionPage baseTitle="Current Season" />} />
            <Route path="resources/*" element={<SectionPage baseTitle="Resources" />} />
            <Route path="archives/*" element={<SectionPage baseTitle="THL Archives" />} />
            <Route path="blog" element={<SimplePage title="Blog" />} />
            <Route path="shop" element={<SimplePage title="Shop" />} />
            <Route path="contact" element={<SimplePage title="Contact Us" />} />

            <Route
              path="playhub/:tab?"
              element={
                <RequireAuth>
                  <PlayHubPage />
                </RequireAuth>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
