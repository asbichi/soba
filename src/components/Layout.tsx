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
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between bg-slate-900 border-b border-slate-800 p-4">
        <span className="text-xl font-bold text-white tracking-tight">Soba LGA</span>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-slate-300 hover:text-white transition-colors">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar */}
      <div className={clsx(
        "bg-slate-900 w-full md:w-64 border-r border-slate-800 flex-col justify-between hidden md:flex",
        mobileMenuOpen ? "!flex absolute z-50 h-full w-64 shadow-2xl" : ""
      )}>
        <div>
          <div className="p-6 hidden md:block">
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
                    isActive ? "bg-emerald-500/10 text-emerald-400" : "text-slate-300 hover:bg-slate-800 hover:text-white",
                    "group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon className={clsx(
                    isActive ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-300",
                    "flex-shrink-0 -ml-1 mr-3 h-5 w-5 transition-colors"
                  )} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center mb-4">
            <div className="ml-3">
              <p className="text-sm font-medium text-white truncate">{dbUser?.name}</p>
              <p className="text-xs font-medium text-emerald-400/80 truncate">{dbUser?.role.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center w-full px-3 py-2 text-sm font-medium text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <main className="p-4 md:p-8 lg:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
