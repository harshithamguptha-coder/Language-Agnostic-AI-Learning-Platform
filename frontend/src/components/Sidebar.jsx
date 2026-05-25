import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'

const Sidebar = ({
  chatSessions = [],
  activeSessionId = null,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  activeModule = 'chat',
  onSelectModule,
  theme = 'dark',
}) => {
  const { logout } = useAuth()
  const [contextMenu, setContextMenu] = useState(null)
  const isDark = theme === 'dark'

  const surfaceClass = isDark
    ? 'border-slate-800 bg-slate-950 text-slate-100'
    : 'border-slate-200 bg-white text-slate-950'
  const mutedTextClass = isDark ? 'text-slate-400' : 'text-slate-500'
  const activeClass = isDark ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-950'
  const idleClass = isDark
    ? 'text-slate-400 hover:bg-slate-900 hover:text-white'
    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
  const dividerClass = isDark ? 'border-slate-800' : 'border-slate-200'
  const moduleButtons = [
    { id: 'voice', label: 'Voice-Based Learning Assistant' },
    { id: 'quiz', label: 'AI Quiz Generator' },
    { id: 'upload', label: 'Upload Documents' },
    { id: 'summarizer', label: 'Study Notes Summarizer' },
  ]

  useEffect(() => {
    const closeMenu = () => setContextMenu(null)
    window.addEventListener('click', closeMenu)
    window.addEventListener('scroll', closeMenu, true)
    return () => {
      window.removeEventListener('click', closeMenu)
      window.removeEventListener('scroll', closeMenu, true)
    }
  }, [])

  const openChatMenu = (event, session) => {
    event.preventDefault()
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      session,
    })
  }

  const handleDelete = () => {
    if (!contextMenu?.session) return
    onDeleteChat?.(contextMenu.session.id)
    setContextMenu(null)
  }

  return (
    <aside className={`flex w-full max-w-xs flex-col border-r p-5 md:w-72 ${surfaceClass}`}>
      <div className="mb-8">
        <div className={isDark ? 'text-2xl font-semibold text-white' : 'text-2xl font-semibold text-slate-950'}>
          EduAssist
        </div>
        <p className={`mt-2 text-sm ${mutedTextClass}`}>Multilingual AI learning support.</p>
      </div>
      {onNewChat && (
        <div className={`min-h-0 flex-1 border-t pt-4 ${dividerClass}`}>
          <button
            onClick={onNewChat}
            className="mb-4 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            New Chat
          </button>
          <div className="mb-6 space-y-2">
            {moduleButtons.map((module) => (
              <button
                key={module.id}
                type="button"
                onClick={() => onSelectModule?.(module.id)}
                className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                  activeModule === module.id ? activeClass : idleClass
                }`}
              >
                {module.label}
              </button>
            ))}
          </div>
          <div className={`mb-3 text-xs font-semibold uppercase tracking-[0.18em] ${mutedTextClass}`}>
            Recent chats
          </div>
          <div className="max-h-[46vh] space-y-2 overflow-y-auto pr-1">
            {chatSessions.length === 0 ? (
              <div className={`rounded-xl border px-3 py-3 text-sm ${dividerClass} ${mutedTextClass}`}>No chats yet</div>
            ) : (
              chatSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => onSelectChat?.(session.id)}
                  onContextMenu={(event) => openChatMenu(event, session)}
                  className={`w-full truncate rounded-xl px-3 py-3 text-left text-sm transition ${
                    activeSessionId === session.id ? activeClass : idleClass
                  }`}
                  title={session.title}
                >
                  {session.title}
                </button>
              ))
            )}
          </div>
          {contextMenu && (
            <div
              className={`fixed z-50 min-w-32 rounded-xl border p-1 shadow-xl ${
                isDark ? 'border-slate-800 bg-slate-950 text-slate-100' : 'border-slate-200 bg-white text-slate-900'
              }`}
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={handleDelete}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
                  isDark ? 'text-red-300 hover:bg-red-950/40' : 'text-red-600 hover:bg-red-50'
                }`}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}
      <div className={`mt-6 border-t pt-4 text-sm ${dividerClass}`}>
        <button
          onClick={logout}
          className={`w-full rounded-xl px-4 py-2 text-sm font-semibold transition ${
            isDark ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
          }`}
        >
          Logout
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
