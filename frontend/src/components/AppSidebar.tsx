import {
  Home, MessageCircle, Stethoscope, LayoutDashboard,
  Settings, Bell, HelpCircle, LogOut, Sun, Moon, Languages, User,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { t, lang, setLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { currentUser, logout } = useAuth();

  const mainItems = [
    { title: t.home, url: "/", icon: Home },
    { title: t.chat, url: "/chat", icon: MessageCircle },
    { title: t.symptoms, url: "/symptoms", icon: Stethoscope },
    { title: t.dashboard, url: "/dashboard", icon: LayoutDashboard },
  ];

  const secondaryItems = [
    { title: t.notifications, url: "#", icon: Bell },
    { title: t.settings, url: "#", icon: Settings },
    { title: t.help, url: "#", icon: HelpCircle },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-bold uppercase tracking-wider text-primary">
            {!collapsed && "HealthCare+"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent/60 rounded-lg transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator className="my-2" />

        <SidebarGroup>
          <SidebarGroupLabel>{!collapsed && t.other}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url} className="hover:bg-sidebar-accent/60 rounded-lg transition-colors">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 space-y-2">
        {/* User info chip */}
        {currentUser && !collapsed && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-sidebar-accent/40 mb-1">
            <div className="h-7 w-7 rounded-full hero-gradient flex items-center justify-center shrink-0">
              <User className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-sidebar-foreground truncate">{currentUser.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{currentUser.email}</p>
            </div>
          </div>
        )}

        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 w-full p-2 rounded-lg text-sm hover:bg-sidebar-accent/60 transition-colors text-sidebar-foreground"
        >
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          {!collapsed && (theme === "light" ? t.dark : t.light)}
        </button>
        <button
          onClick={() => setLang(lang === "en" ? "hi" : "en")}
          className="flex items-center gap-2 w-full p-2 rounded-lg text-sm hover:bg-sidebar-accent/60 transition-colors text-sidebar-foreground"
        >
          <Languages className="h-4 w-4" />
          {!collapsed && (lang === "en" ? "हिंदी" : "English")}
        </button>
        <Separator />
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full p-2 rounded-lg text-sm hover:bg-destructive/10 text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && t.logout}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
