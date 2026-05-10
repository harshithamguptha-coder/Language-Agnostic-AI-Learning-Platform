import { useAuth } from '../hooks/useAuth'

const Profile = () => {
  const { user } = useAuth()
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 px-6 py-8 text-white md:px-10">
      <div className="mx-auto w-full max-w-5xl rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl shadow-black/20">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Profile</h1>
            <p className="mt-2 text-sm text-slate-400">Personalized learning details and user settings.</p>
          </div>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl bg-slate-950/80 p-6">
            <h2 className="text-xl font-semibold text-white">Account</h2>
            <div className="mt-4 space-y-3">
              <div className="rounded-3xl bg-slate-900 p-4 text-sm text-slate-200">
                <div className="text-slate-400">Username</div>
                <div className="mt-1 text-lg font-medium text-white">{user?.username}</div>
              </div>
              <div className="rounded-3xl bg-slate-900 p-4 text-sm text-slate-200">
                <div className="text-slate-400">Email</div>
                <div className="mt-1 text-lg font-medium text-white">{user?.email}</div>
              </div>
            </div>
          </div>
          <div className="rounded-3xl bg-slate-950/80 p-6">
            <h2 className="text-xl font-semibold text-white">Learning Support</h2>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              Your assistant maintains chat history and educational context for a personalized experience. Use the chat dashboard to upload study materials and ask questions in English, Kannada, or Hindi.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
