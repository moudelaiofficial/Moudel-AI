
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

// Legal pages
import PrivacyPolicy from './pages/legal/PrivacyPolicy.jsx'
import TermsAndConditions from './pages/legal/TermsAndConditions.jsx'
import CookiePolicy from './pages/legal/CookiePolicy.jsx'
import DataDeletion from './pages/legal/DataDeletion.jsx'
import ResearchDisclaimer from './pages/legal/ResearchDisclaimer.jsx'
import AcceptableUse from './pages/legal/AcceptableUse.jsx'
import ConsentPage from './pages/legal/ConsentPage.jsx'

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
      {/* Public pages */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Legal pages */}
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsAndConditions />} />
      <Route path="/cookies" element={<CookiePolicy />} />
      <Route path="/data-deletion" element={<DataDeletion />} />
      <Route path="/research-disclaimer" element={<ResearchDisclaimer />} />
      <Route path="/acceptable-use" element={<AcceptableUse />} />
      <Route
        path="/consent"
        element={
          <ProtectedRoute>
            <ConsentPage />
          </ProtectedRoute>
        }
      />

      {/* Protected workspace */}
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

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
