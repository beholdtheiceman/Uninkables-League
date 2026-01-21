import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

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
  const isRoute = item.kind === "route";

  if (isRoute) {
    return (
      <Link className={className} role="menuitem" to={item.to} onClick={() => onSelect(item)}>
        {item.label}
      </Link>
    );
  }

  return (
    <a
      className={className}
      role="menuitem"
      href={item.href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noreferrer" : undefined}
      onClick={(e) => {
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
      { kind: "route", label: "Home", to: "/" },
      { kind: "route", label: "Culture", to: "/culture" },
      { kind: "route", label: "New Player’s Guide", to: "/new-players-guide" },
      { kind: "route", label: "Register", to: "/register" },
      {
        kind: "route",
        label: "Current Season",
        to: "/current-season",
        items: [
          {
            kind: "route",
            label: "Legacy Series",
            to: "/current-season/legacy",
            items: [
              { kind: "route", label: "Weeks", to: "/current-season/legacy/weeks" },
              { kind: "route", label: "Forms", to: "/current-season/legacy/forms" },
              { kind: "route", label: "Teams", to: "/playhub/teams" },
              { kind: "route", label: "Schedule", to: "/playhub/thisweek" },
              { kind: "route", label: "Standings", to: "/playhub/standings" },
              { kind: "route", label: "Stats", to: "/current-season/legacy/stats" },
              { kind: "route", label: "Scouting", to: "/current-season/legacy/scouting" }
            ],
          },
          {
            kind: "route",
            label: "Hero Series",
            to: "/current-season/hero",
            items: [
              { kind: "route", label: "Weeks", to: "/current-season/hero/weeks" },
              { kind: "route", label: "Forms", to: "/current-season/hero/forms" },
              { kind: "route", label: "Teams", to: "/playhub/teams" },
              { kind: "route", label: "Schedule", to: "/playhub/thisweek" },
              { kind: "route", label: "Standings", to: "/playhub/standings" },
              { kind: "route", label: "Stats", to: "/current-season/hero/stats" },
              { kind: "route", label: "Scouting", to: "/current-season/hero/scouting" }
            ],
          },
          {
            kind: "route",
            label: "Pro Series",
            to: "/current-season/pro",
            items: [
              { kind: "route", label: "Weeks", to: "/current-season/pro/weeks" },
              { kind: "route", label: "Forms", to: "/current-season/pro/forms" },
              { kind: "route", label: "Teams", to: "/playhub/teams" },
              { kind: "route", label: "Schedule", to: "/playhub/thisweek" },
              { kind: "route", label: "Standings", to: "/playhub/standings" },
              { kind: "route", label: "Stats", to: "/current-season/pro/stats" },
              { kind: "route", label: "Scouting", to: "/current-season/pro/scouting" }
            ],
          },
          {
            kind: "route",
            label: "Wild Series",
            to: "/current-season/wild",
            items: [
              { kind: "route", label: "Weeks", to: "/current-season/wild/weeks" },
              { kind: "route", label: "Forms", to: "/current-season/wild/forms" },
              { kind: "route", label: "Teams", to: "/playhub/teams" },
              { kind: "route", label: "Schedule", to: "/playhub/thisweek" },
              { kind: "route", label: "Standings", to: "/playhub/standings" },
              { kind: "route", label: "Stats", to: "/current-season/wild/stats" },
              { kind: "route", label: "Scouting", to: "/current-season/wild/scouting" }
            ],
          },
          { kind: "route", label: "Player Database", to: "/current-season/player-database" },
          { kind: "route", label: "Crossover Stats", to: "/current-season/crossover-stats" }
        ],
      },
      {
        kind: "route",
        label: "Resources",
        to: "/resources",
        items: [
          { kind: "route", label: "Rules", to: "/resources/rules" },
          { kind: "route", label: "Captain Guide & Overview", to: "/resources/captain-guide" },
          { kind: "route", label: "Best Practices", to: "/resources/best-practices" },
          { kind: "route", label: "PR Calculator", to: "/resources/pr-calculator" },
          { kind: "route", label: "Ban Process", to: "/resources/ban-process" },
          { kind: "route", label: "Time Zone Converter", to: "/resources/time-zone" },
          { kind: "route", label: "Discord Timestamp Generator", to: "/resources/discord-timestamp" }
        ],
      },
      {
        kind: "route",
        label: "THL Archives",
        to: "/archives",
        items: [
          { kind: "route", label: "Legacy Archives", to: "/archives/legacy" },
          { kind: "route", label: "Hero Archives", to: "/archives/hero" },
          { kind: "route", label: "Pro Archives", to: "/archives/pro" },
          { kind: "route", label: "Wild Archives", to: "/archives/wild" },
          { kind: "route", label: "Lifetime Stat Dashboard", to: "/archives/lifetime-stats" },
          { kind: "route", label: "Hall of Fame", to: "/archives/hall-of-fame" }
        ],
      },
      { kind: "route", label: "Blog", to: "/blog" },
      { kind: "route", label: "Shop", to: "/shop" },
      { kind: "route", label: "Contact Us", to: "/contact" }
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
        <Link className="brand" to="/" onClick={() => setOpenPath([])}>
          Uninkables League Hub
        </Link>

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

