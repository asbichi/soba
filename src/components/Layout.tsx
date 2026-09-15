import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, FileSignature, CheckCircle, List, Settings, LogOut, Menu } from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';

export function Layout() {
  const { dbUser, signOut } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'COLLATION_OFFICER', 'VIEWER'] },
    { name: 'Result Entry', href: '/results/entry', icon: FileSignature, roles: ['SUPER_ADMIN', 'POLLING_UNIT_OFFICER'] },
    { name: 'Verification', href: '/results/verify', icon: CheckCircle, roles: ['SUPER_ADMIN', 'COLLATION_OFFICER'] },
    { name: 'Reports', href: '/reports', icon: List, roles: ['SUPER_ADMIN', 'COLLATION_OFFICER', 'VIEWER'] },
    { name: 'Admin', href: '/admin', icon: Settings, roles: ['SUPER_ADMIN'] },
  ];

  const filteredNav = navigation.filter(item => 
    !item.roles || (dbUser && item.roles.includes(dbUser.role))
  );

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row font-sans relative">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between bg-zinc-900 border-b border-zinc-800 p-4 sticky top-0 z-30">
        <span className="text-xl font-bold text-white tracking-tight">Soba LGA</span>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-zinc-300 hover:text-white transition-colors p-1">
          <Menu className="w-7 h-7" />
        </button>
      </div>

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={clsx(
        "bg-zinc-900 border-r border-zinc-800 flex-col justify-between fixed md:sticky top-0 h-screen w-64 z-50 transition-transform duration-300 ease-in-out md:translate-x-0",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div>
            <div className="p-6 md:block">
              <h1 className="text-xl font-bold text-white tracking-tight leading-tight">Soba LGA<br/><span className="text-sm font-medium text-emerald-400">Election System</span></h1>
            </div>
            <nav className="mt-4 px-3 space-y-1">
              {filteredNav.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={clsx(
                      isActive ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-300 hover:bg-zinc-800 hover:text-white",
                      "group flex items-center px-3 py-3 text-base md:text-sm font-medium rounded-lg transition-all duration-200"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <item.icon className={clsx(
                      isActive ? "text-emerald-400" : "text-zinc-400 group-hover:text-zinc-300",
                      "flex-shrink-0 -ml-1 mr-3 h-5 w-5 transition-colors"
                    )} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="p-4 border-t border-zinc-800 mt-auto">
            <div className="flex items-center mb-4">
              <div className="ml-3">
                <p className="text-sm font-medium text-white truncate">{dbUser?.name}</p>
                <p className="text-xs font-medium text-emerald-400/80 truncate">{dbUser?.role.replace('_', ' ')}</p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="flex items-center w-full px-3 py-3 md:py-2 text-base md:text-sm font-medium text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto w-full">
        <main className="p-4 md:p-8 lg:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
