import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { 
  Home, 
  Users, 
  BookOpen, 
  GraduationCap, 
  Settings, 
  LogOut,
  Menu,
  X,
  UserCircle,
  Video,
  ScanFace,
  Sun,
  Moon
} from 'lucide-react';
import { useState } from 'react';
import lucyLogo from '../assets/lucy_logobg.png';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    ...(user?.role === 'ADMIN' ? [
      { path: '/admin/classes', label: 'Classes', icon: Users },
      { path: '/admin/users', label: 'Users', icon: UserCircle },
      { path: '/admin/courses', label: 'Courses', icon: BookOpen },
      { path: '/admin/face-verifications', label: 'Face Verification', icon: ScanFace },
    ] : []),
    ...(user?.role === 'TEACHER' ? [
      { path: '/my-classes', label: 'My Classes', icon: Users },
      { path: '/live-sessions', label: 'Live Classes', icon: Video },
    ] : []),
    ...(user?.role === 'STUDENT' ? [
      { path: '/my-classes', label: 'My Classes', icon: GraduationCap },
      { path: '/live-sessions', label: 'Live Classes', icon: Video },
    ] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700 bg-primary-900 dark:bg-primary-950">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white rounded-lg p-1 flex items-center justify-center">
              <img src={lucyLogo} alt="Lucy College" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-lg text-white">Lucy College</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 hover:bg-primary-800 dark:hover:bg-primary-900 rounded">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100%-4rem)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-primary-900 dark:bg-primary-800 text-white font-medium' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-gray-700 hover:text-primary-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64 min-h-screen flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 lg:px-6 shadow-sm">
          <button 
            onClick={() => setSidebarOpen(true)} 
            className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <Menu className="w-5 h-5 dark:text-gray-300" />
          </button>

          <div className="flex-1 lg:hidden" />

          <div className="hidden lg:flex items-center gap-2 text-primary-900 dark:text-primary-300 font-semibold">
            <GraduationCap className="w-5 h-5" />
            <span>Learning Management System</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white"
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.fullName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role?.toLowerCase()}</p>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary-900 dark:bg-primary-700 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm sm:text-base">
                {user?.fullName?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
