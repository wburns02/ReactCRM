import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Truck, Umbrella, ChevronDown, Sun, Moon, LogOut } from "lucide-react";
import { EntitySwitcher } from "@/components/layout/EntitySwitcher";
import {
  topNavItems,
  techNavItems,
  navGroups,
  benefitsTopNavItems,
  benefitsPlatformGroups,
  type NavGroup,
} from "./navConfig";
import { useLiveChatUnread } from "@/features/live-chat/useLiveChatUnread";

interface SidebarProps {
  user: { first_name?: string; last_name?: string; email?: string } | null;
  isTechnician: boolean;
  isDark: boolean;
  toggleTheme: () => void;
  logout: () => void;
}

export function Sidebar({ user, isTechnician, isDark, toggleTheme, logout }: SidebarProps) {
  const location = useLocation();
  const { totalUnread } = useLiveChatUnread();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("sidebarExpandedGroups");
    return saved ? new Set(JSON.parse(saved)) : new Set(["operations", "benefits-platform"]);
  });

  const inBenefits =
    location.pathname === "/benefits" || location.pathname.startsWith("/benefits/");

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const isGroupActive = (group: NavGroup) =>
    group.items.some((item) => isActive(item.path));

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      localStorage.setItem("sidebarExpandedGroups", JSON.stringify([...next]));
      return next;
    });
  };

  return (
    <aside
      className={
        "w-64 flex-col overflow-hidden hidden md:flex " +
        (inBenefits
          ? "bg-gradient-to-b from-[#2a1230] via-[#3a1845] to-[#2a1230]"
          : "bg-gradient-to-b from-[#0c1929] via-[#0f2035] to-[#0c1929]")
      }
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-white/[0.08] flex-shrink-0">
        <Link
          to={inBenefits ? "/benefits" : "/dashboard"}
          className="flex items-center gap-3 group"
        >
          <div
            className={
              "w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 " +
              (inBenefits
                ? "bg-gradient-to-br from-[#c77dff] to-[#7b2cbf] shadow-[#c77dff]/20 group-hover:shadow-[#c77dff]/40"
                : "bg-gradient-to-br from-[#2aabe1] to-[#104b95] shadow-[#2aabe1]/20 group-hover:shadow-[#2aabe1]/40")
            }
          >
            {inBenefits ? (
              <Umbrella className="w-5 h-5 text-white" />
            ) : (
              <Truck className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="leading-tight">
            <span className="text-white font-semibold text-sm block tracking-wide">
              {inBenefits ? "Benefits" : "Mac Service"}
            </span>
            <span className="text-white/40 text-[11px] block">
              {inBenefits ? "Mac Service Platform" : "Platform"}
            </span>
          </div>
        </Link>
      </div>

      <EntitySwitcher />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 sidebar-scroll">
        {inBenefits ? (
          <>
            <ul className="space-y-0.5 mb-5">
              {benefitsTopNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                        active
                          ? "bg-white/[0.12] text-white"
                          : "text-white/60 hover:text-white hover:bg-white/[0.06]"
                      }`}
                    >
                      <Icon
                        className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                          active ? "text-[#c77dff]" : ""
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                      {active && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#c77dff] shrink-0" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="space-y-2">
              {benefitsPlatformGroups.map((group) => {
                const GroupIcon = group.icon;
                const expanded = expandedGroups.has(group.name);
                return (
                  <div key={group.name}>
                    <button
                      onClick={() => toggleGroup(group.name)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider text-white/40 hover:text-white/60 transition-all duration-150"
                    >
                      <GroupIcon className="w-3.5 h-3.5 shrink-0" />
                      <span className="flex-1 text-left">{group.label}</span>
                      <ChevronDown
                        className={`w-3 h-3 shrink-0 transition-transform duration-200 ${
                          expanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {expanded && (
                      <ul className="mt-1 space-y-0.5 ml-1.5 border-l border-white/[0.08] pl-2">
                        {group.items.map((item) => {
                          const Icon = item.icon;
                          const active = isActive(item.path);
                          return (
                            <li key={item.path}>
                              <Link
                                to={item.path}
                                className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-all duration-150 ${
                                  active
                                    ? "bg-white/[0.1] text-white font-medium"
                                    : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
                                }`}
                              >
                                <Icon
                                  className={`w-[15px] h-[15px] shrink-0 ${
                                    active ? "text-[#c77dff]" : ""
                                  }`}
                                />
                                <span className="truncate">{item.label}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : isTechnician ? (
          <ul className="space-y-1">
            {techNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                      active
                        ? "bg-white/[0.08] text-white shadow-sm shadow-black/10"
                        : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    <Icon className={`w-[18px] h-[18px] shrink-0 transition-colors ${active ? "text-[#2aabe1]" : ""}`} />
                    {item.label}
                    {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#2aabe1]" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <>
            <ul className="space-y-0.5 mb-5">
              {topNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                        active
                          ? "bg-white/[0.08] text-white"
                          : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      <Icon className={`w-[18px] h-[18px] shrink-0 transition-colors ${active ? "text-[#2aabe1]" : ""}`} />
                      <span className="truncate">{item.label}</span>
                      {item.path === "/live-chat" && totalUnread > 0 ? (
                        <span className="ml-auto flex items-center gap-1 px-1.5 py-0.5 text-[9px] rounded-full font-bold shrink-0 bg-red-500 text-white animate-pulse">
                          {totalUnread > 99 ? "99+" : totalUnread}
                        </span>
                      ) : item.badge === "LIVE" ? (
                        <span className="ml-auto flex items-center gap-1 px-1.5 py-0.5 text-[9px] rounded font-semibold shrink-0 bg-emerald-500/20 text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {item.badge}
                        </span>
                      ) : item.badge ? (
                        <span className="ml-auto px-1.5 py-0.5 text-[9px] rounded font-semibold shrink-0 bg-amber-500/20 text-amber-400">
                          {item.badge}
                        </span>
                      ) : active ? (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#2aabe1] shrink-0" />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="space-y-2">
              {navGroups.map((group) => {
                const GroupIcon = group.icon;
                const expanded = expandedGroups.has(group.name);
                const groupActive = isGroupActive(group);

                return (
                  <div key={group.name}>
                    <button
                      onClick={() => toggleGroup(group.name)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all duration-150 ${
                        groupActive ? "text-white/70" : "text-white/30 hover:text-white/50"
                      }`}
                    >
                      <GroupIcon className="w-3.5 h-3.5 shrink-0" />
                      <span className="flex-1 text-left">{group.label}</span>
                      {group.badge && (
                        <span className="px-1.5 py-0.5 text-[9px] bg-white/[0.08] text-white/50 rounded font-medium tracking-normal">
                          {group.badge}
                        </span>
                      )}
                      <ChevronDown className={`w-3 h-3 shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
                    </button>

                    {expanded && (
                      <ul className="mt-1 space-y-0.5 ml-1.5 border-l border-white/[0.06] pl-2">
                        {group.items.map((item) => {
                          const Icon = item.icon;
                          const active = isActive(item.path);
                          return (
                            <li key={item.path}>
                              <Link
                                to={item.path}
                                className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-all duration-150 ${
                                  active
                                    ? "bg-white/[0.08] text-white font-medium"
                                    : "text-white/45 hover:text-white/75 hover:bg-white/[0.03]"
                                }`}
                              >
                                <Icon className={`w-[15px] h-[15px] shrink-0 transition-colors ${active ? "text-[#2aabe1]" : ""}`} />
                                <span className="truncate">{item.label}</span>
                                {item.badge && (
                                  <span className={`ml-auto px-1.5 py-0.5 text-[9px] rounded font-semibold shrink-0 ${
                                    item.badge === "LIVE"
                                      ? "bg-emerald-500/20 text-emerald-400"
                                      : item.badge === "NEW"
                                        ? "bg-amber-500/20 text-amber-400"
                                        : "bg-white/[0.08] text-white/50"
                                  }`}>
                                    {item.badge}
                                  </span>
                                )}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </nav>

      {/* User Section */}
      <div className="px-4 py-3 border-t border-white/[0.08] flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#2aabe1] to-[#104b95] text-white flex items-center justify-center text-sm font-semibold shadow-lg shadow-[#2aabe1]/10">
            {user?.first_name?.charAt(0) || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-[11px] text-white/35 truncate">{user?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 text-[12px] text-white/35 hover:text-white/70 transition-colors"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            {isDark ? "Light" : "Dark"}
          </button>
          <span className="text-white/10">|</span>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-[12px] text-white/35 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
