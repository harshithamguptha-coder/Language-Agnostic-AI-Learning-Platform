import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import Sidebar from '../components/Sidebar'
import ChatBubble from '../components/ChatBubble'
import FileUpload from '../components/FileUpload'
import {
  sendChat,
  getChatSessions,
  createChatSession,
  getChatSessionMessages,
  deleteChatSession,
  uploadDocument,
} from '../services/chat'

const makeChatTitle = (text) => {
  const title = text.trim().replace(/\s+/g, ' ')
  if (!title) return 'New chat'
  return title.length > 60 ? `${title.slice(0, 57)}...` : title
}

const Dashboard = () => {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [question, setQuestion] = useState('')
  const [chatSessions, setChatSessions] = useState([])
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
  const [uploadDetails, setUploadDetails] = useState(null)
  const [extractedPreview, setExtractedPreview] = useState('')
  const [isOcrOpen, setIsOcrOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('dashboard_theme') || 'dark')
  const messagesEndRef = useRef(null)
  const isDark = theme === 'dark'

  useEffect(() => {
    const loadSessions = async () => {
      if (!user?.id) return
      try {
        const data = await getChatSessions()
        setChatSessions(data.sessions)
        if (data.sessions.length > 0) {
          await loadSessionMessages(data.sessions[0].id)
        }
      } catch (err) {
        console.error(err)
      }
    }
    loadSessions()
  }, [user?.id])

  useEffect(() => {
    localStorage.setItem('dashboard_theme', theme)
  }, [theme])

  const refreshSessions = async (selectedSessionId = activeSessionId) => {
    const data = await getChatSessions()
    setChatSessions(data.sessions)
    if (selectedSessionId) {
      setActiveSessionId(selectedSessionId)
    }
  }

  const loadSessionMessages = async (sessionId) => {
    const data = await getChatSessionMessages(sessionId)
    setActiveSessionId(sessionId)
    setMessages(
      data.history.flatMap((item) => [
        { sender: 'user', text: item.query },
        { sender: 'assistant', text: item.response },
      ]),
    )
    setUploadMessage('')
    setUploadDetails(null)
    setExtractedPreview('')
    setIsOcrOpen(false)
  }

  const clearChatWorkspace = () => {
    setActiveSessionId(null)
    setMessages([])
    setQuery('')
    setQuestion('')
    setSelectedFile(null)
    setUploadMessage('')
    setUploadDetails(null)
    setExtractedPreview('')
  }

  const handleNewChat = async () => {
    try {
      const session = await createChatSession()
      setChatSessions((prev) => [session, ...prev])
      setActiveSessionId(session.id)
      setMessages([])
      setQuery('')
      setQuestion('')
      setSelectedFile(null)
      setUploadMessage('')
      setUploadDetails(null)
      setExtractedPreview('')
      setIsOcrOpen(false)
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteChat = async (sessionId) => {
    const deletedSession = chatSessions.find((session) => session.id === sessionId)
    const shouldDelete = window.confirm(`Delete "${deletedSession?.title || 'this chat'}"?`)
    if (!shouldDelete) return

    try {
      await deleteChatSession(sessionId)
      const remainingSessions = chatSessions.filter((session) => session.id !== sessionId)
      setChatSessions(remainingSessions)

      if (activeSessionId !== sessionId) return

      if (remainingSessions.length > 0) {
        await loadSessionMessages(remainingSessions[0].id)
      } else {
        clearChatWorkspace()
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleChatSubmit = async (event) => {
    event.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    const messagePayload = { query: query.trim(), session_id: activeSessionId }
    const submittedQuery = query.trim()
    const newMessages = [...messages, { sender: 'user', text: query.trim() }]
    setMessages(newMessages)
    if (activeSessionId) {
      setChatSessions((prev) =>
        prev.map((session) =>
          session.id === activeSessionId && session.title === 'New chat'
            ? { ...session, title: makeChatTitle(submittedQuery) }
            : session,
        ),
      )
    }
    setQuery('')
    try {
      const result = await sendChat(messagePayload)
      setMessages((prev) => [...prev, { sender: 'assistant', text: result.response }])
      setActiveSessionId(result.session_id)
      await refreshSessions(result.session_id)
    } catch (err) {
      setMessages((prev) => [...prev, { sender: 'assistant', text: 'Unable to fetch response. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async () => {
    if (!selectedFile) return
    setUploadMessage('Processing upload...')
    setUploadDetails(null)
    setExtractedPreview('')
    const formDataQuestion = question.trim()
    try {
      const result = await uploadDocument(selectedFile, formDataQuestion, activeSessionId)
      setUploadDetails({
        fileName: result.file_name,
        method: result.extraction_method,
        pages: result.page_count,
        ocrPages: result.ocr_pages,
        confidence: result.average_confidence,
        textLength: result.text_length,
      })
      setExtractedPreview(result.extracted_text)
      setUploadMessage(
        formDataQuestion
          ? 'Upload complete. Answer generated.'
          : 'Upload complete. Extracted text is ready for questions.',
      )
      if (formDataQuestion) {
        setMessages((prev) => [
          ...prev,
          { sender: 'user', text: formDataQuestion },
          { sender: 'assistant', text: result.ai_answer },
        ])
        if (result.session_id) {
          setActiveSessionId(result.session_id)
          setChatSessions((prev) =>
            prev.map((session) =>
              session.id === result.session_id && session.title === 'New chat'
                ? { ...session, title: makeChatTitle(formDataQuestion) }
                : session,
            ),
          )
          await refreshSessions(result.session_id)
        }
        setQuestion('')
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            text: `Document uploaded successfully. Extracted ${result.text_length} characters from ${result.file_name}.`,
          },
        ])
      }
    } catch (err) {
      setUploadMessage(err.response?.data?.detail || 'Upload failed. Please try again.')
    } finally {
      setSelectedFile(null)
    }
  }

  const pageClass = isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-950'
  const panelClass = isDark
    ? 'border-slate-800 bg-slate-900/90 shadow-black/20'
    : 'border-slate-200 bg-white shadow-slate-200/80'
  const innerPanelClass = isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-50'
  const inputClass = isDark
    ? 'border-slate-700 bg-slate-950 text-white placeholder:text-slate-400 focus:border-blue-500'
    : 'border-slate-300 bg-white text-slate-950 placeholder:text-slate-500 focus:border-blue-500'
  const mutedTextClass = isDark ? 'text-slate-400' : 'text-slate-500'
  const softTextClass = isDark ? 'text-slate-300' : 'text-slate-700'

  return (
    <div className={`min-h-screen ${pageClass}`}>
      <div className="grid min-h-screen grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
        <Sidebar
          chatSessions={chatSessions}
          activeSessionId={activeSessionId}
          onNewChat={handleNewChat}
          onSelectChat={loadSessionMessages}
          onDeleteChat={handleDeleteChat}
          onOpenOcr={() => setIsOcrOpen((open) => !open)}
          isOcrOpen={isOcrOpen}
          theme={theme}
        />
        <main className="flex flex-col p-6 md:p-8">
          <div className={`mb-6 rounded-3xl border p-6 shadow-xl ${panelClass}`}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-semibold">Language agnostic chatbot</h1>
                <p className={`mt-2 text-sm ${mutedTextClass}`}>
                  Ask questions, upload material, and learn in your own language.
                </p>
              </div>
              <div className="relative flex items-center gap-3 self-start md:self-center">
                <button
                  type="button"
                  onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
                  className={`rounded-full px-4 py-3 text-sm font-semibold transition ${
                    isDark ? 'bg-slate-950 text-slate-100 hover:bg-slate-800' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  {isDark ? 'Light mode' : 'Dark mode'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsProfileOpen((open) => !open)}
                  aria-label="Open user profile"
                  className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
                    isDark ? 'bg-slate-950 text-slate-100 hover:bg-slate-800' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M20 21a8 8 0 0 0-16 0"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                </button>
                {isProfileOpen && (
                  <div
                    className={`absolute right-0 top-14 z-10 w-72 rounded-2xl border p-4 text-sm shadow-xl ${
                      isDark ? 'border-slate-800 bg-slate-950 text-slate-200' : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <div className={`mb-3 text-xs font-semibold uppercase tracking-[0.18em] ${mutedTextClass}`}>
                      Profile
                    </div>
                    <div className="font-semibold">{user?.username}</div>
                    <div className={`mt-1 break-words ${mutedTextClass}`}>{user?.email}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={`grid gap-6 ${isOcrOpen ? 'lg:grid-cols-[2fr_1fr]' : 'lg:grid-cols-1'}`}>
            <section className={`rounded-3xl border p-6 shadow-xl ${panelClass}`}>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Chat</h2>
                  <p className={`mt-1 text-sm ${mutedTextClass}`}>Your conversation history and assistant responses.</p>
                </div>
                {loading && <span className="text-sm text-blue-300">Generating response...</span>}
              </div>
              {messages.length > 0 && (
                <div className={`mb-6 max-h-[54vh] space-y-3 overflow-y-auto rounded-3xl border p-4 ${innerPanelClass}`}>
                  {messages.map((message, index) => (
                    <ChatBubble key={index} sender={message.sender} message={message.text} theme={theme} />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
              <form onSubmit={handleChatSubmit} className="space-y-4">
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask a question in English, Kannada or Hindi..."
                  rows={3}
                  className={`w-full resize-none rounded-3xl border px-4 py-3 text-sm outline-none transition ${inputClass}`}
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-3xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                  >
                    Send Question
                  </button>
                </div>
              </form>
            </section>
            {isOcrOpen && (
            <section className={`rounded-3xl border p-6 shadow-xl ${panelClass}`}>
              <div className="mb-5">
                <h2 className="text-xl font-semibold">Upload & OCR</h2>
                <p className={`mt-1 text-sm ${mutedTextClass}`}>
                  Upload a file to extract text and ask questions about it.
                </p>
              </div>
              <div className="space-y-4">
                <FileUpload onFileChange={setSelectedFile} selectedFile={selectedFile} theme={theme} />
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask a question about the uploaded document..."
                  rows={3}
                  className={`w-full resize-none rounded-3xl border px-4 py-3 text-sm outline-none transition ${inputClass}`}
                />
                <button
                  onClick={handleFileUpload}
                  disabled={!selectedFile}
                  className="w-full rounded-3xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {selectedFile ? `Upload ${selectedFile.name}` : 'Select a file first'}
                </button>
                {uploadMessage && <p className={`text-sm ${softTextClass}`}>{uploadMessage}</p>}
                {uploadDetails && (
                  <div className={`space-y-3 rounded-2xl border p-4 ${innerPanelClass}`}>
                    <div className={`grid grid-cols-2 gap-3 text-xs ${mutedTextClass}`}>
                      <div>
                        <div className={mutedTextClass}>Method</div>
                        <div className={`mt-1 font-medium ${softTextClass}`}>{uploadDetails.method.replaceAll('_', ' ')}</div>
                      </div>
                      <div>
                        <div className={mutedTextClass}>OCR pages</div>
                        <div className={`mt-1 font-medium ${softTextClass}`}>
                          {uploadDetails.ocrPages}
                          {uploadDetails.pages ? ` / ${uploadDetails.pages}` : ''}
                        </div>
                      </div>
                      <div>
                        <div className={mutedTextClass}>Confidence</div>
                        <div className={`mt-1 font-medium ${softTextClass}`}>
                          {uploadDetails.confidence === null ? 'N/A' : `${uploadDetails.confidence}%`}
                        </div>
                      </div>
                      <div>
                        <div className={mutedTextClass}>Extracted</div>
                        <div className={`mt-1 font-medium ${softTextClass}`}>{uploadDetails.textLength} chars</div>
                      </div>
                    </div>
                    {uploadDetails.confidence !== null && uploadDetails.confidence < 50 && (
                      <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-5 text-amber-100">
                        OCR confidence is low. Use a clearer, brighter, less tilted image for better handwritten note extraction.
                      </p>
                    )}
                    {extractedPreview && (
                      <details className={`text-sm ${softTextClass}`}>
                        <summary className="cursor-pointer font-medium">Extracted text preview</summary>
                        <div className={`mt-3 max-h-52 overflow-y-auto whitespace-pre-wrap rounded-2xl border p-3 text-xs leading-5 ${innerPanelClass}`}>
                          {extractedPreview}
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </div>
            </section>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default Dashboard
