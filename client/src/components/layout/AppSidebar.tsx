import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Users,
  FileText,
  User,
  LogOut,
  Home,
  Menu,
  GraduationCap,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import apiService from '@/services/api';

const menuItems = [
  { title: 'Dashboard', url: '/dashboard', icon: Home },
  { title: 'Data Kelas', url: '/kelas', icon: GraduationCap },
  { title: 'Data Mata Pelajaran', url: '/mapel', icon: BookOpen },
  { title: 'Data Siswa', url: '/siswa', icon: Users },
  { title: 'Data Ujian', url: '/ujian', icon: FileText },
];

export function AppSidebar() {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const currentPath = location.pathname;
  const collapsed = state === 'collapsed';
  const isMobileDevice = useIsMobile();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary text-primary-foreground font-medium shadow-sm" 
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground";

  // Auto-close sidebar on mobile after navigation
  useEffect(() => {
    if (isMobileDevice && isMobile) {
      // Close sidebar when route changes on mobile
      setOpenMobile(false);
    }
  }, [currentPath, isMobileDevice, isMobile, setOpenMobile]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      
      // Close sidebar before logout on mobile
      if (isMobileDevice) {
        setOpenMobile(false);
      }

      // Call logout API
      await apiService.logout();
      
      // Show success toast
      toast({
        title: "Logout Berhasil",
        description: "Anda telah berhasil keluar dari sistem",
      });

      // Redirect to login page
      navigate('/auth', { replace: true });
      
    } catch (error) {
      console.error('Logout error:', error);
      
      // Even if API call fails, still clear local data and redirect
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      apiService.token = null;
      
      toast({
        title: "Logout",
        description: "Anda telah keluar dari sistem",
      });
      
      navigate('/auth', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleMenuClick = () => {
    // Close sidebar on mobile when menu item is clicked
    if (isMobileDevice) {
      // Small delay to allow navigation to complete
      setTimeout(() => {
        setOpenMobile(false);
      }, 100);
    }
  };

  return (
    <Sidebar className={cn(
      "border-r border-border bg-card transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      <SidebarContent className="p-4">
        {/* Logo/Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-white">
            <GraduationCap className="h-6 w-6" />
          </div>
          {!collapsed && (
            <div>
              <h2 className="text-lg font-bold text-foreground">Sistem</h2>
              <p className="text-xs text-muted-foreground">Penilaian Otomatis</p>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className={cn(
            "text-xs uppercase tracking-wide text-muted-foreground mb-2",
            collapsed && "hidden"
          )}>
            Menu Utama
          </SidebarGroupLabel>
          
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <NavLink 
                    to={item.url} 
                    onClick={handleMenuClick}
                    className={({ isActive }) => cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200 w-full",
                      getNavCls({ isActive })
                    )}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && <span className="truncate">{item.title}</span>}
                  </NavLink>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Logout Button */}
        <div className="mt-auto pt-4">
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "default"}
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={cn(
              "w-full justify-start gap-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
              collapsed && "justify-center",
              isLoggingOut && "opacity-50 cursor-not-allowed"
            )}
          >
            {isLoggingOut ? (
              <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin" />
            ) : (
              <LogOut className="h-5 w-5 flex-shrink-0" />
            )}
            {!collapsed && (
              <span>{isLoggingOut ? 'Keluar...' : 'Logout'}</span>
            )}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}