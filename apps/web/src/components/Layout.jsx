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
  Moon,
  FileText,
  FolderOpen,
  User,
  Bell,
  Calendar,
  ClipboardList,
  Award,
  CalendarClock
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import lucyLogo from '../assets/lucy_logobg.png';
import { getAdminNotifications, getNotifications, markAllNotificationsRead } from '../api';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [notifications, setNotifications] = useState({
    faceVerifications: 0,
    studentProfiles: 0,
    pendingUsers: 0,
    total: 0,
  });
  const [studentNotifications, setStudentNotifications] = useState({
    notifications: [],
    unreadCount: 0,
  });

  // Fetch notifications for admin
  const fetchNotifications = useCallback(async () => {
    if (user?.role === 'ADMIN') {
      try {
        const data = await getAdminNotifications();
        setNotifications(data);
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    } else if (user?.role === 'STUDENT') {
      try {
        const data = await getNotifications();
        setStudentNotifications(data);
      } catch (err) {
        console.error('Failed to fetch student notifications:', err);
      }
    }
  }, [user?.role]);

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Refresh notifications when location changes
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchNotifications();
    }
  }, [location.pathname, user?.role, fetchNotifications]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Get notification count for a specific path
  const getNotificationCount = (path) => {
    if (user?.role !== 'ADMIN') return 0;
    switch (path) {
      case '/admin/face-verifications':
        return notifications.faceVerifications;
      case '/admin/student-profiles':
        return notifications.studentProfiles;
      case '/admin/users':
        return notifications.pendingUsers;
      default:
        return 0;
    }
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    ...(user?.role === 'ADMIN' ? [
      { path: '/admin/classes', label: 'Classes', icon: Users },
      { path: '/admin/users', label: 'Users', icon: UserCircle },
      { path: '/admin/courses', label: 'Courses', icon: BookOpen },
      { path: '/admin/academic', label: 'Academic', icon: Calendar },
      { path: '/admin/face-verifications', label: 'Face Verification', icon: ScanFace },
      { path: '/admin/student-profiles', label: 'Student Profiles', icon: FileText },
      { path: '/admin/student-files', label: 'Student Files', icon: FolderOpen },
      { path: '/admin/add-drop-requests', label: 'Add/Drop Requests', icon: ClipboardList },
    ] : []),
    ...(user?.role === 'TEACHER' ? [
      { path: '/my-classes', label: 'My Classes', icon: Users },
      { path: '/teacher/grades', label: 'Grade Management', icon: ClipboardList },
      { path: '/live-sessions', label: 'Live Classes', icon: Video },
    ] : []),
    ...(user?.role === 'STUDENT' ? [
      { path: '/my-classes', label: 'My Classes', icon: GraduationCap },
      { path: '/student/registration', label: 'Semester Registration', icon: ClipboardList },
      { path: '/student/add-drop', label: 'Add/Drop Courses', icon: ClipboardList },
      { path: '/student/exams', label: 'Exam Schedule', icon: CalendarClock },
      { path: '/student/results', label: 'My Results', icon: Award },
      { path: '/live-sessions', label: 'Live Classes', icon: Video },
      { path: '/student-profile', label: 'My Profile', icon: User },
    ] : []),
    { path: '/settings', label: 'Settings', icon: Settings },
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
            const notifCount = getNotificationCount(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative ${
                  isActive 
                    ? 'bg-primary-900 dark:bg-primary-800 text-white font-medium' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-gray-700 hover:text-primary-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {item.label}
                {notifCount > 0 && (
                  <span className="absolute right-2 flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                    {notifCount > 99 ? '99+' : notifCount}
                  </span>
                )}
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
            {/* Notification Bell - Student */}
            {user?.role === 'STUDENT' && studentNotifications.unreadCount > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white relative"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full animate-bounce">
                    {studentNotifications.unreadCount > 99 ? '99+' : studentNotifications.unreadCount}
                  </span>
                </button>

                {/* Dropdown */}
                {showNotificationDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-y-auto">
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                      <h3 className="font-semibold text-sm">Notifications</h3>
                      <button
                        onClick={async () => {
                          await markAllNotificationsRead();
                          setStudentNotifications({ ...studentNotifications, unreadCount: 0, notifications: studentNotifications.notifications.map(n => ({ ...n, isRead: true })) });
                          setShowNotificationDropdown(false);
                        }}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Mark all read
                      </button>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {studentNotifications.notifications.slice(0, 5).map(notif => (
                        <Link
                          key={notif.id}
                          to={notif.type === 'REGISTRATION_OPEN' ? '/student/registration' : notif.type === 'GRADE_PUBLISHED' ? '/student/results' : notif.type === 'NEW_ASSESSMENT' ? '/my-classes' : '/'}
                          onClick={() => setShowNotificationDropdown(false)}
                          className={`block p-3 hover:bg-gray-50 dark:hover:bg-gray-700 ${!notif.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                        >
                          <p className="text-sm font-medium">{notif.title}</p>
                          <p className="text-xs text-gray-500 mt-1">{notif.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </Link>
                      ))}
                      {studentNotifications.notifications.length === 0 && (
                        <p className="p-4 text-center text-gray-500 text-sm">No notifications</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Notification Bell - Admin only */}
            {user?.role === 'ADMIN' && notifications.total > 0 && (
              <div className="relative">
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full animate-bounce">
                    {notifications.total > 99 ? '99+' : notifications.total}
                  </span>
                </button>
              </div>
            )}

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
            {user?.profileImage ? (
              <img 
                src={user.profileImage} 
                alt={user.fullName} 
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-primary-900 dark:border-primary-700"
              />
            ) : (
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary-900 dark:bg-primary-700 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm sm:text-base">
                  {user?.fullName?.charAt(0)?.toUpperCase()}
                </span>
              </div>
            )}
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
