
import { Routes, Route } from 'react-router-dom'

import HomePage from './pages/Home/HomePage.jsx'
import LoginPage from './pages/Auth/LoginPage.jsx'
import SignupPage from './pages/Auth/SignupPage.jsx'
import ProtectedRoute from './pages/Auth/ProtectedRoute.jsx'

import WorkspaceLayout from './components/workspace/WorkspaceLayout.jsx'
import OverviewPage from './pages/Workspace/OverviewPage.jsx'
import DiscoverPage from './pages/Workspace/DiscoverPage.jsx'
import LibraryPage from './pages/Workspace/LibraryPage.jsx'
import RecentPage from './pages/Workspace/RecentPage.jsx'
import CollectionsPage from './pages/Workspace/CollectionsPage.jsx'
import SettingsPage from './pages/Workspace/SettingsPage.jsx'

function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f2e8] text-[#1c1b19]">
      <div className="text-center">
        <h1 className="font-serif text-5xl">404</h1>
        <p className="mt-3 text-sm text-[#5f5b50]">
          The page you're looking for doesn't exist.
        </p>
      </div>
    </main>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route
        path="/workspace"
        element={
          <ProtectedRoute>
            <WorkspaceLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<OverviewPage />} />
        <Route path="discover" element={<DiscoverPage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="recent" element={<RecentPage />} />
        <Route path="collections" element={<CollectionsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
