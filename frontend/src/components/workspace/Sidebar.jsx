
import { NavLink } from 'react-router-dom'
import {
  Activity,
  BookOpen,
  Compass,
  FolderOpen,
  History,
  Library,
  Settings,
} from 'lucide-react'

const navigation = [
  {
    label: 'Overview',
    path: '/workspace',
    icon: BookOpen,
    end: true,
  },
  {
    label: 'Discover',
    path: '/workspace/discover',
    icon: Compass,
  },
  {
    label: 'My Library',
    path: '/workspace/library',
    icon: Library,
  },
  {
    label: 'Recent',
    path: '/workspace/recent',
    icon: History,
  },
]

export default function Sidebar() {
  return (
    <aside className="hidden w-[250px] shrink-0 border-r border-[#d9d2bf] bg-[#f2eee3] px-5 py-6 md:flex md:flex-col">
      {/* BRAND */}
      <div className="flex items-center gap-2.5 px-2">
        <img
          src="/moudel-favicon.png"
          alt="Moudel AI logo"
          className="h-9 w-9 shrink-0 object-contain"
        />

        <span className="font-serif text-xl">
          Moudel <span className="text-violet-600">AI</span>
        </span>
      </div>

      {/* MAIN NAVIGATION */}
      <div className="mt-12">
        <p className="mb-4 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#999181]">
          Workspace
        </p>

        <nav className="space-y-1">
          {navigation.map(({ label, path, icon: Icon, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) =>
                `flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm transition ${
                  isActive
                    ? 'bg-[#e8e2f8] font-medium text-[#5037a5]'
                    : 'text-[#716b61] hover:bg-[#eae5d9]'
                }`
              }
            >
              <Icon size={17} strokeWidth={1.8} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* COLLECTIONS */}
      <div className="mt-10 border-t border-[#d9d2bf] pt-6">
        <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#999181]">
          Collections
        </p>

        <NavLink
          to="/workspace/collections"
          className={({ isActive }) =>
            `mt-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
              isActive
                ? 'bg-[#e8e2f8] font-medium text-[#5037a5]'
                : 'text-[#716b61] hover:bg-[#eae5d9]'
            }`
          }
        >
          <FolderOpen size={16} />
          All collections
        </NavLink>

        <p className="px-3 pt-3 text-xs leading-5 text-[#999181]">
          Your research collections will appear here.
        </p>
      </div>

      {/* BOTTOM NAVIGATION */}
      <div className="mt-auto border-t border-[#d9d2bf] pt-5">
        <NavLink
          to="/workspace/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
              isActive
                ? 'bg-[#e8e2f8] font-medium text-[#5037a5]'
                : 'text-[#716b61] hover:bg-[#eae5d9]'
            }`
          }
        >
          <Settings size={17} />
          Settings
        </NavLink>
      </div>
    </aside>
  )
}
