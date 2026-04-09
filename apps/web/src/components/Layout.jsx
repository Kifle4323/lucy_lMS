import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
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
  ScanFace
} from 'lucide-react';
import { useState } from 'react';
import lucyLogo from '../assets/lucy_logobg.png';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
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
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <Link to="/" className="flex items-center gap-2">
            <img src={lucyLogo} alt="Lucy College" className="w-8 h-8 object-contain" />
            <span className="font-bold text-lg text-primary-900">Lucy College</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-primary-50 text-primary-700 font-medium' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
          <button 
            onClick={() => setSidebarOpen(true)} 
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{user?.fullName}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role?.toLowerCase()}</p>
            </div>
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-700 font-semibold">
                {user?.fullName?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
