import React from "react";
import { NavLink } from "react-router-dom";
import { Home, Activity, CalendarCheck, Trophy, User, LayoutDashboard, Users, Award, Building2, BarChart3 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const MobileNav = () => {
  const { user } = useAuth();
  if (!user) return null;

  const role = user.role || "STUDENT";

  const studentItems = [
    { to: "/app", label: "HOME", icon: Home, end: true },
    { to: "/app/sports", label: "SPORTS", icon: Activity },
    { to: "/app/tournaments", label: "COMPETE", icon: Trophy },
    { to: "/app/my-bookings", label: "PASS", icon: CalendarCheck },
    { to: "/app/profile", label: "PROFILE", icon: User },
  ];

  const coachItems = [
    { to: "/coach", label: "DASHBOARD", icon: LayoutDashboard, end: true },
    { to: "/coach/students", label: "ATHLETES", icon: Users },
    { to: "/coach/training", label: "TRAINING", icon: CalendarCheck },
    { to: "/coach/assessments", label: "ASSESS", icon: Award },
    { to: "/coach/profile", label: "PROFILE", icon: User },
  ];

  const adminItems = [
    { to: "/admin", label: "OVERVIEW", icon: LayoutDashboard, end: true },
    { to: "/admin/occupancy", label: "COURTS", icon: Building2 },
    { to: "/admin/analytics", label: "AI DEMAND", icon: BarChart3 },
    { to: "/admin/tournaments", label: "BRACKETS", icon: Trophy },
    { to: "/admin/equipment", label: "GEAR", icon: Activity },
  ];

  const items = role === "ADMIN" ? adminItems : role === "COACH" ? coachItems : studentItems;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#080808]/95 backdrop-blur-xl border-t border-white/10 px-2 py-2 flex items-center justify-around">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1 px-2.5 transition-colors ${
                isActive ? "text-[#FF4D00]" : "text-[#888880] hover:text-[#F2F0EB]"
              }`
            }
          >
            <Icon className="w-4 h-4" />
            <span className="text-[9px] font-mono tracking-widest font-bold">{item.label}</span>
          </NavLink>
        );
      })}
    </div>
  );
};
