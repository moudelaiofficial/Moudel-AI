
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import WorkspaceHeader from './WorkspaceHeader.jsx'

export default function WorkspaceLayout() {
  return (
    <div className="flex min-h-screen bg-[#f6f2e8] text-[#1c1b19]">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <WorkspaceHeader />

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
