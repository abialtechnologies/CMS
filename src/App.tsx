import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AuthGuard } from './components/AuthGuard'
import { AuthProvider } from './context/AuthContext'
import { DashboardPage } from './pages/DashboardPage'
import { BlogListPage } from './pages/BlogListPage'
import { BlogEditorPage } from './pages/BlogEditorPage'
import { SettingsPage } from './pages/SettingsPage'
import { ProfilePage } from './pages/ProfilePage'
import { LoginPage } from './pages/LoginPage'
import { OAuthCallbackPage } from './pages/OAuthCallbackPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { MediaLibraryPage } from './pages/MediaLibraryPage'
import { SeoReportsPage } from './pages/SeoReportsPage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/login"          element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/oauth-callback" element={<OAuthCallbackPage />} />

        {/* Protected — requires login */}
        <Route element={<AuthGuard />}>
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/posts" element={<BlogListPage />} />
            <Route path="/new" element={<BlogEditorPage />} />
            <Route path="/edit/:id" element={<BlogEditorPage />} />
            <Route path="/media" element={<MediaLibraryPage />} />
            <Route path="/seo" element={<SeoReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  )
}
