
import { Routes, Route } from 'react-router-dom'

import HomePage from './pages/Home/HomePage.jsx'
import LoginPage from './pages/Auth/LoginPage.jsx'
import SignupPage from './pages/Auth/SignupPage.jsx'
import ProtectedRoute from './pages/Auth/ProtectedRoute.jsx'

import SEO from './components/SEO.jsx'

import WorkspaceLayout from './components/workspace/WorkspaceLayout.jsx'
import OverviewPage from './pages/Workspace/OverviewPage.jsx'
import DiscoverPage from './pages/Workspace/DiscoverPage.jsx'
import LibraryPage from './pages/Workspace/LibraryPage.jsx'
import RecentPage from './pages/Workspace/RecentPage.jsx'
import CollectionsPage from './pages/Workspace/CollectionsPage.jsx'
import SettingsPage from './pages/Workspace/SettingsPage.jsx'
import ZeraPage from './pages/Workspace/Zera.jsx'

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
    <>
      <SEO
        title="Page Not Found"
        description="The requested page could not be found."
        path="/404"
        noindex
      />

      <main className="flex min-h-screen items-center justify-center bg-[#f6f2e8] text-[#1c1b19]">
        <div className="text-center">
          <h1 className="font-serif text-5xl">404</h1>
          <p className="mt-3 text-sm text-[#5f5b50]">
            The page you're looking for doesn't exist.
          </p>
        </div>
      </main>
    </>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Homepage */}
      <Route path="/" element={<HomePage />} />

      {/* Authentication pages */}
      <Route
        path="/login"
        element={
          <>
            <SEO
              title="Login"
              description="Sign in to your Moudel AI research workspace."
              path="/login"
              noindex
            />
            <LoginPage />
          </>
        }
      />

      <Route
        path="/signup"
        element={
          <>
            <SEO
              title="Create Account"
              description="Create your Moudel AI account and start organizing your research."
              path="/signup"
              noindex
            />
            <SignupPage />
          </>
        }
      />

      {/* Public legal pages */}
      <Route
        path="/privacy"
        element={
          <>
            <SEO
              title="Privacy Policy"
              description="Read how Moudel AI handles personal information, privacy, and data protection."
              path="/privacy"
            />
            <PrivacyPolicy />
          </>
        }
      />

      <Route
        path="/terms"
        element={
          <>
            <SEO
              title="Terms and Conditions"
              description="Review the terms and conditions governing the use of Moudel AI."
              path="/terms"
            />
            <TermsAndConditions />
          </>
        }
      />

      <Route
        path="/cookies"
        element={
          <>
            <SEO
              title="Cookie Policy"
              description="Learn how Moudel AI uses cookies and optional analytics technologies."
              path="/cookies"
            />
            <CookiePolicy />
          </>
        }
      />

      <Route
        path="/data-deletion"
        element={
          <>
            <SEO
              title="Data Deletion"
              description="Learn how to request deletion of your Moudel AI account and associated data."
              path="/data-deletion"
            />
            <DataDeletion />
          </>
        }
      />

      <Route
        path="/research-disclaimer"
        element={
          <>
            <SEO
              title="Research Disclaimer"
              description="Understand the limitations and intended use of research information provided through Moudel AI."
              path="/research-disclaimer"
            />
            <ResearchDisclaimer />
          </>
        }
      />

      <Route
        path="/acceptable-use"
        element={
          <>
            <SEO
              title="Acceptable Use Policy"
              description="Review the acceptable use rules for the Moudel AI research workspace."
              path="/acceptable-use"
            />
            <AcceptableUse />
          </>
        }
      />

      {/* Protected consent page */}
      <Route
        path="/consent"
        element={
          <ProtectedRoute>
            <>
              <SEO
                title="Consent Settings"
                description="Manage your Moudel AI consent preferences."
                path="/consent"
                noindex
              />
              <ConsentPage />
            </>
          </ProtectedRoute>
        }
      />

      {/* Protected workspace */}
      <Route
        path="/workspace"
        element={
          <ProtectedRoute>
            <>
              <SEO
                title="Research Workspace"
                description="Your private Moudel AI research workspace."
                path="/workspace"
                noindex
              />
              <WorkspaceLayout />
            </>
          </ProtectedRoute>
        }
      >
        <Route index element={<OverviewPage />} />

        <Route path="discover" element={<DiscoverPage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="recent" element={<RecentPage />} />
        <Route path="collections" element={<CollectionsPage />} />
        <Route path="settings" element={<SettingsPage />} />

        {/* ZERA */}
        <Route path="zera" element={<ZeraPage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
