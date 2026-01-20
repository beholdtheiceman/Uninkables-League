import React, { useEffect, useMemo, useRef, useState } from "react";

function isModifiedClick(e) {
  return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
}

function normalizeHashHref(href) {
  if (!href) return null;
  if (href.startsWith("#")) return href;
  return null;
}

function scrollToHash(href) {
  const hash = normalizeHashHref(href);
  if (!hash) return false;
  const id = hash.slice(1);
  const el = document.getElementById(id);
  if (!el) return false;
  if (window.location.hash !== hash) {
    window.history.replaceState(null, "", hash);
  }
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  return true;
}

function MenuLink({ item, onSelect, className }) {
  if (item.kind === "action") {
    return (
      <button
        type="button"
        className={className}
        role="menuitem"
        onClick={() => onSelect(item)}
      >
        {item.label}
      </button>
    );
  }

  const isExternal = item.kind === "external";
  return (
    <a
      className={className}
      role="menuitem"
      href={item.href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noreferrer" : undefined}
      onClick={(e) => {
        if (isModifiedClick(e)) return;
        if (!isExternal && normalizeHashHref(item.href)) {
          const didScroll = scrollToHash(item.href);
          if (didScroll) e.preventDefault();
        }
        onSelect(item);
      }}
    >
      {item.label}
    </a>
  );
}

function DesktopMenu({ items, openPath, setOpenPath, onSelect }) {
  return (
    <div className="navLinks" role="menubar" aria-label="Site navigation">
      {items.map((top, i) => {
        const isOpen = openPath[0] === i;
        const hasChildren = Boolean(top.items?.length);

        if (!hasChildren) {
          return (
            <MenuLink
              key={top.label}
              item={top}
              className="navLink"
              onSelect={onSelect}
            />
          );
        }

        return (
          <div key={top.label} className="navItem">
            <button
              type="button"
              className="navLink navLinkBtn"
              aria-haspopup="menu"
              aria-expanded={isOpen}
              onClick={() => setOpenPath(isOpen ? [] : [i])}
            >
              {top.label}
              <span className="navCaret" aria-hidden="true">
                ▾
              </span>
            </button>

            {isOpen ? (
              <div className="navDropdown" role="menu">
                {top.items.map((child, j) => {
                  const isChildOpen = openPath[1] === j;
                  const childHasChildren = Boolean(child.items?.length);

                  if (!childHasChildren) {
                    return (
                      <MenuLink
                        key={child.label}
                        item={child}
                        className="navDropdownItem"
                        onSelect={onSelect}
                      />
                    );
                  }

                  return (
                    <div key={child.label} className="navDropdownSub">
                      <button
                        type="button"
                        className="navDropdownItem navDropdownItemBtn"
                        aria-haspopup="menu"
                        aria-expanded={isChildOpen}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenPath(isChildOpen ? [i] : [i, j]);
                        }}
                      >
                        {child.label}
                        <span className="navCaretRight" aria-hidden="true">
                          ▸
                        </span>
                      </button>

                      {isChildOpen ? (
                        <div className="navFlyout" role="menu">
                          {child.items.map((leaf) => (
                            <MenuLink
                              key={leaf.label}
                              item={leaf}
                              className="navDropdownItem"
                              onSelect={onSelect}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function MobileMenu({ items, openGroups, setOpenGroups, onSelect }) {
  return (
    <div className="navMobilePanel" role="dialog" aria-label="Mobile menu">
      {items.map((top) => {
        const hasChildren = Boolean(top.items?.length);
        const isOpen = Boolean(openGroups[top.label]);

        if (!hasChildren) {
          return (
            <MenuLink
              key={top.label}
              item={top}
              className="navMobileLink"
              onSelect={onSelect}
            />
          );
        }

        return (
          <div key={top.label} className="navMobileGroup">
            <button
              type="button"
              className="navMobileGroupBtn"
              aria-expanded={isOpen}
              onClick={() =>
                setOpenGroups((s) => ({ ...s, [top.label]: !s[top.label] }))
              }
            >
              {top.label}
              <span className="navCaret" aria-hidden="true">
                ▾
              </span>
            </button>
            {isOpen ? (
              <div className="navMobileGroupItems">
                {top.items.map((child) => {
                  const childHasChildren = Boolean(child.items?.length);
                  const childKey = `${top.label} > ${child.label}`;
                  const childOpen = Boolean(openGroups[childKey]);

                  if (!childHasChildren) {
                    return (
                      <MenuLink
                        key={childKey}
                        item={child}
                        className="navMobileLinkSub"
                        onSelect={onSelect}
                      />
                    );
                  }

                  return (
                    <div key={childKey} className="navMobileGroup">
                      <button
                        type="button"
                        className="navMobileGroupBtn navMobileGroupBtnSub"
                        aria-expanded={childOpen}
                        onClick={() =>
                          setOpenGroups((s) => ({
                            ...s,
                            [childKey]: !s[childKey],
                          }))
                        }
                      >
                        {child.label}
                        <span className="navCaret" aria-hidden="true">
                          ▾
                        </span>
                      </button>
                      {childOpen ? (
                        <div className="navMobileGroupItems">
                          {child.items.map((leaf) => (
                            <MenuLink
                              key={`${childKey} > ${leaf.label}`}
                              item={leaf}
                              className="navMobileLinkLeaf"
                              onSelect={onSelect}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default function SiteNav({ user, loading, onOpenPlayHub }) {
  const rootRef = useRef(null);
  const [openPath, setOpenPath] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState({});

  const menu = useMemo(() => {
    return [
      { kind: "link", label: "Home", href: "#home" },
      { kind: "link", label: "Culture", href: "#culture" },
      { kind: "link", label: "New Player’s Guide", href: "#new-players-guide" },
      { kind: "link", label: "Register", href: "#register" },
      {
        kind: "link",
        label: "Current Season",
        href: "#current-season",
        items: [
          {
            kind: "link",
            label: "Legacy Series",
            href: "#legacy-series",
            items: [
              { kind: "link", label: "Weeks", href: "#legacy-weeks" },
              { kind: "link", label: "Forms", href: "#legacy-forms" },
              { kind: "link", label: "Teams", href: "#legacy-teams" },
              { kind: "link", label: "Schedule", href: "#legacy-schedule" },
              { kind: "link", label: "Standings", href: "#legacy-standings" },
              { kind: "link", label: "Stats", href: "#legacy-stats" },
              { kind: "link", label: "Scouting", href: "#legacy-scouting" },
            ],
          },
          {
            kind: "link",
            label: "Hero Series",
            href: "#hero-series",
            items: [
              { kind: "link", label: "Weeks", href: "#hero-weeks" },
              { kind: "link", label: "Forms", href: "#hero-forms" },
              { kind: "link", label: "Teams", href: "#hero-teams" },
              { kind: "link", label: "Schedule", href: "#hero-schedule" },
              { kind: "link", label: "Standings", href: "#hero-standings" },
              { kind: "link", label: "Stats", href: "#hero-stats" },
              { kind: "link", label: "Scouting", href: "#hero-scouting" },
            ],
          },
          {
            kind: "link",
            label: "Pro Series",
            href: "#pro-series",
            items: [
              { kind: "link", label: "Weeks", href: "#pro-weeks" },
              { kind: "link", label: "Forms", href: "#pro-forms" },
              { kind: "link", label: "Teams", href: "#pro-teams" },
              { kind: "link", label: "Schedule", href: "#pro-schedule" },
              { kind: "link", label: "Standings", href: "#pro-standings" },
              { kind: "link", label: "Stats", href: "#pro-stats" },
              { kind: "link", label: "Scouting", href: "#pro-scouting" },
            ],
          },
          {
            kind: "link",
            label: "Wild Series",
            href: "#wild-series",
            items: [
              { kind: "link", label: "Weeks", href: "#wild-weeks" },
              { kind: "link", label: "Forms", href: "#wild-forms" },
              { kind: "link", label: "Teams", href: "#wild-teams" },
              { kind: "link", label: "Schedule", href: "#wild-schedule" },
              { kind: "link", label: "Standings", href: "#wild-standings" },
              { kind: "link", label: "Stats", href: "#wild-stats" },
              { kind: "link", label: "Scouting", href: "#wild-scouting" },
            ],
          },
          { kind: "link", label: "Player Database", href: "#player-database" },
          { kind: "link", label: "Crossover Stats", href: "#crossover-stats" },
        ],
      },
      {
        kind: "link",
        label: "Resources",
        href: "#resources",
        items: [
          { kind: "link", label: "Rules", href: "#rules" },
          { kind: "link", label: "Captain Guide & Overview", href: "#captain-guide" },
          { kind: "link", label: "Best Practices", href: "#best-practices" },
          { kind: "link", label: "PR Calculator", href: "#pr-calculator" },
          { kind: "link", label: "Ban Process", href: "#ban-process" },
          { kind: "link", label: "Time Zone Converter", href: "#time-zone" },
          { kind: "link", label: "Discord Timestamp Generator", href: "#discord-timestamp" },
        ],
      },
      {
        kind: "link",
        label: "THL Archives",
        href: "#archives",
        items: [
          { kind: "link", label: "Legacy Archives", href: "#legacy-archives" },
          { kind: "link", label: "Hero Archives", href: "#hero-archives" },
          { kind: "link", label: "Pro Archives", href: "#pro-archives" },
          { kind: "link", label: "Wild Archives", href: "#wild-archives" },
          { kind: "link", label: "Lifetime Stat Dashboard", href: "#lifetime-stats" },
          { kind: "link", label: "Hall of Fame", href: "#hall-of-fame" },
        ],
      },
      { kind: "link", label: "Blog", href: "#blog" },
      { kind: "link", label: "Shop", href: "#shop" },
      { kind: "link", label: "Contact Us", href: "#contact" },
    ];
  }, []);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") {
        setOpenPath([]);
        setMobileOpen(false);
      }
    }
    function onPointerDown(e) {
      const root = rootRef.current;
      if (!root) return;
      if (!root.contains(e.target)) {
        setOpenPath([]);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  function handleSelect(item) {
    setOpenPath([]);
    setMobileOpen(false);
    if (item.kind === "action") item.onSelect?.();
  }

  return (
    <div ref={rootRef} className="siteNav">
      <div className="siteNavInner">
        <a
          className="brand"
          href="#home"
          onClick={(e) => {
            if (isModifiedClick(e)) return;
            const didScroll = scrollToHash("#home");
            if (didScroll) e.preventDefault();
            setOpenPath([]);
          }}
        >
          Uninkables League Hub
        </a>

        <div className="navDesktop">
          <DesktopMenu
            items={menu}
            openPath={openPath}
            setOpenPath={setOpenPath}
            onSelect={handleSelect}
          />
        </div>

        <div className="navRight">
          <button
            type="button"
            className="navCta"
            onClick={onOpenPlayHub}
            disabled={loading || !user}
            title={!user ? "Login to open PlayHub" : "Open PlayHub"}
          >
            Open PlayHub
          </button>

          <button
            type="button"
            className="navHamburger"
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            ☰
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="navMobileOverlay" onClick={() => setMobileOpen(false)}>
          <div className="navMobileWrap" onClick={(e) => e.stopPropagation()}>
            <MobileMenu
              items={menu}
              openGroups={openGroups}
              setOpenGroups={setOpenGroups}
              onSelect={handleSelect}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

