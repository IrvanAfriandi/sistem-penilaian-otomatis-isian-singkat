import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Menu, Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import apiService from '@/services/api';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  // Function untuk mengambil info user dari session
  const getUserInfo = () => {
    const userData = apiService.getCurrentUser();
    
    if (!userData) {
      return {
        initials: '',
        fullName: 'User'
      };
    }

    // Membuat inisial dari nama depan dan belakang
    const firstInitial = userData.nama_depan ? userData.nama_depan.charAt(0).toUpperCase() : '';
    const lastInitial = userData.nama_belakang ? userData.nama_belakang.charAt(0).toUpperCase() : '';
    const initials = firstInitial + lastInitial;

    // Gabungkan nama depan dan belakang
    const fullName = `${userData.nama_depan} ${userData.nama_belakang}`.trim();

    return {
      initials: initials || '',
      fullName: fullName || 'User'
    };
  };

  const { initials, fullName } = getUserInfo();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header dengan Safe Area */}
          <header className="
            sticky top-0 z-50 
            h-16 border-b border-border bg-card 
            px-3 md:px-6 
            flex items-center justify-between
            pt-safe-top
            min-h-[calc(4rem+env(safe-area-inset-top))]
          ">
            <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
              <SidebarTrigger className="
                h-10 w-10 rounded-md border border-input 
                bg-background hover:bg-accent hover:text-accent-foreground 
                inline-flex items-center justify-center
                flex-shrink-0
              ">
                <Menu className="h-5 w-5" />
              </SidebarTrigger>
              
              {/* Search - Responsive */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Cari ..." 
                  className="
                    pl-10 w-full bg-background
                    text-sm md:text-base
                  "
                />
              </div>
            </div>

            {/* Right Section - Responsive */}
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              <Button variant="ghost" size="icon" className="relative h-9 w-9 md:h-10 md:w-10">
                <Bell className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
              
              {/* User Info - Hide on small screens */}
              <div className="hidden sm:flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center text-white text-sm font-medium">
                  {initials}
                </div>
                <span className="text-sm font-medium truncate max-w-32">
                  {fullName}
                </span>
              </div>
              
              {/* User Avatar only on mobile */}
              <div className="sm:hidden h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center text-white text-sm font-medium">
                {initials}
              </div>
            </div>
          </header>

          {/* Main Content dengan Safe Area Bottom */}
          <main className="
            flex-1 p-3 md:p-6 overflow-auto
            pb-safe-bottom
            min-h-0
          ">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}