import React, { useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";
import LoginPanel from "./components/LoginPanel.jsx";
import PlayHub from "./components/PlayHub.jsx";
import SiteNav from "./components/SiteNav.jsx";

function InnerApp() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div>
      <SiteNav user={user} loading={loading} onOpenPlayHub={() => setOpen(true)} />

      <main className="container" style={{ display: "grid", gap: 16 }}>
        <section id="home" className="card">
          <div style={{ fontSize: 20, fontWeight: 800 }}>Uninkables League Hub</div>
          <div style={{ opacity: 0.75, marginTop: 6 }}>
            PlayHub (Team League) — MVP scaffold
          </div>
        </section>

        <section className="grid2">
          <div className="card">
            <strong>Status</strong>
            <div style={{ marginTop: 8, opacity: 0.85 }}>
              {loading
                ? "Checking session..."
                : user
                  ? "Authenticated. Use the navigation to explore sections or open PlayHub."
                  : "Login to start."}
            </div>
          </div>
          <div className="card">
            <strong>Account</strong>
            <div style={{ marginTop: 12 }}>
              <LoginPanel />
            </div>
          </div>
        </section>

        <section id="culture" className="card">
          <strong>Culture</strong>
          <div style={{ marginTop: 8, opacity: 0.85 }}>
            Placeholder section — add your league’s values, code of conduct, and community
            guidelines here.
          </div>
        </section>

        <section id="new-players-guide" className="card">
          <strong>New Player’s Guide</strong>
          <div style={{ marginTop: 8, opacity: 0.85 }}>
            Placeholder section — onboarding steps, match format, how to schedule, and where to
            ask for help.
          </div>
        </section>

        <section id="register" className="card">
          <strong>Register</strong>
          <div style={{ marginTop: 8, opacity: 0.85 }}>
            Placeholder section — registration form link and requirements.
          </div>
        </section>

        <section id="current-season" className="card">
          <strong>Current Season</strong>
          <div style={{ marginTop: 8, opacity: 0.85 }}>
            This is where you can surface your series pages, weeks, schedules, and standings.
          </div>
        </section>

        <section id="resources" className="card">
          <strong>Resources</strong>
          <div style={{ marginTop: 8, opacity: 0.85 }}>
            Rules, guides, calculators, and utilities. Use the menu dropdown to jump to
            sub-sections once you add them.
          </div>
        </section>

        <section id="archives" className="card">
          <strong>THL Archives</strong>
          <div style={{ marginTop: 8, opacity: 0.85 }}>
            Placeholder section — prior seasons, stats dashboards, champions, hall of fame.
          </div>
        </section>

        <section id="blog" className="card">
          <strong>Blog</strong>
          <div style={{ marginTop: 8, opacity: 0.85 }}>
            Placeholder section — announcements and posts.
          </div>
        </section>

        <section id="shop" className="card">
          <strong>Shop</strong>
          <div style={{ marginTop: 8, opacity: 0.85 }}>
            Placeholder section — merch or supporter links.
          </div>
        </section>

        <section id="contact" className="card">
          <strong>Contact Us</strong>
          <div style={{ marginTop: 8, opacity: 0.85 }}>
            Placeholder section — how to reach admins and where to submit issues.
          </div>
        </section>

        <PlayHub open={open} onClose={() => setOpen(false)} />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <InnerApp />
    </AuthProvider>
  );
}
