import { BrowserRouter, Route, Routes } from 'react-router-dom'
import RequireAdmin from './components/auth/RequireAdmin'
import AdminLayout from './components/layout/AdminLayout'
import { ToastProvider } from './components/ui'
import AddDestination from './pages/AddDestination'
import ActivityLog from './pages/ActivityLog'
import Categories from './pages/Categories'
import Dashboard from './pages/Dashboard'
import Destinations from './pages/Destinations'
import EmailConfirmed from './pages/EmailConfirmed'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Settings from './pages/Settings'
import SignOut from './pages/SignOut'
import Transportation from './pages/Transportation'
import Users from './pages/Users'

export default function App() {
  return (
    <ToastProvider>
    <BrowserRouter>
      <Routes>
        {/* Outside AdminLayout on purpose: the sign-in page has no sidebar or header. */}
        <Route path="login" element={<Login />} />
        <Route path="logout" element={<SignOut />} />
        {/* Public: where travelers land after tapping the link in the sign-up email of the mobile app. */}
        <Route path="email-confirmed" element={<EmailConfirmed />} />
        {/* Everything below needs an active administrator; otherwise RequireAdmin redirects to /login. */}
        <Route element={<RequireAdmin />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="destinations" element={<Destinations />} />
          <Route path="destinations/new" element={<AddDestination />} />
          <Route path="destinations/categories" element={<Categories />} />
          <Route path="transportation" element={<Transportation />} />
          <Route path="users" element={<Users />} />
          <Route path="activity-log" element={<ActivityLog />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        </Route>
      </Routes>
    </BrowserRouter>
    </ToastProvider>
  )
}
