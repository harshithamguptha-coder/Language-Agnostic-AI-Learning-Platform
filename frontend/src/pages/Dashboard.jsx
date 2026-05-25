import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import Sidebar from '../components/Sidebar'
import ChatBubble from '../components/ChatBubble'
import FileUpload from '../components/FileUpload'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import {
  sendChat,
  speakText,
  getChatSessions,
  createChatSession,
  getChatSessionMessages,
  deleteChatSession,
  uploadDocument,
  generateQuiz,
} from '../services/chat'

const getSpeechRecognition = () => {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

const getSpeechLanguage = (voiceLanguage) => {
  if (voiceLanguage === 'hi') return 'hi-IN'
  if (voiceLanguage === 'kn') return 'kn-IN'
  return 'en-IN'
}

const getTtsLanguage = (text) => {
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn'
  if (/[\u0900-\u097F]/.test(text)) return 'hi'
  return 'en'
}

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
  const [quizFile, setQuizFile] = useState(null)
  const [quizResult, setQuizResult] = useState(null)
  const [quizQuestionCount, setQuizQuestionCount] = useState(2)
  const [quizDifficulty, setQuizDifficulty] = useState('Easy')
  const [quizAnswers, setQuizAnswers] = useState({})
  const [quizSummary, setQuizSummary] = useState(null)
  const [quizMessage, setQuizMessage] = useState('')
  const [quizLoading, setQuizLoading] = useState(false)
  const [showQuizAnswers, setShowQuizAnswers] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
  const [uploadDetails, setUploadDetails] = useState(null)
  const [extractedPreview, setExtractedPreview] = useState('')
  // `activeModule` controls which learning module is visible.
  // Start with `null` to show a compact module selector — modules open only when clicked.
  const [activeModule, setActiveModule] = useState(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('dashboard_theme') || 'dark')
  const [voiceLanguage, setVoiceLanguage] = useState('en')
  const [isListening, setIsListening] = useState(false)
  const [voiceMessage, setVoiceMessage] = useState('')
  const messagesEndRef = useRef(null)
  const isDark = theme === 'dark'
  const isConversationModule = activeModule === 'chat' || activeModule === 'voice'
  const { audioState, play, pause, resume, stop, replay } = useAudioPlayer({
    buildAudio: speakText,
    getLanguage: getTtsLanguage,
  })

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
    setActiveModule('chat')
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
      setActiveModule('chat')
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

  const submitChatText = async (text) => {
    const submittedQuery = text.trim()
    if (!submittedQuery) return
    setLoading(true)
    const messagePayload = { query: submittedQuery, session_id: activeSessionId }
    const newMessages = [...messages, { sender: 'user', text: submittedQuery }]
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
    setVoiceMessage('')
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

  const handleChatSubmit = async (event) => {
    event.preventDefault()
    await submitChatText(query)
  }

  const handleVoiceInput = () => {
    const SpeechRecognition = getSpeechRecognition()
    if (!SpeechRecognition) {
      setVoiceMessage('Voice input is not supported in this browser. Try Chrome or Edge.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = getSpeechLanguage(voiceLanguage)
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    setIsListening(true)
    setVoiceMessage('Listening...')
    recognition.start()

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript
      setQuery(transcript)
      setVoiceMessage(`Recognized: ${transcript}`)
      await submitChatText(transcript)
    }

    recognition.onerror = () => {
      setVoiceMessage('Could not recognize speech. Please try again.')
    }

    recognition.onend = () => {
      setIsListening(false)
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

  const handleGenerateQuiz = async (retryItems = null) => {
    if (!quizFile) return

    const questionCount = retryItems?.length || quizQuestionCount
    const startedAt = performance.now()
    console.log('[quiz] generation started', {
      fileName: quizFile.name,
      fileSize: quizFile.size,
      questionCount,
      difficulty: quizDifficulty,
      retryCount: retryItems?.length || 0,
    })
    setQuizLoading(true)
    setQuizMessage(retryItems?.length ? 'Regenerating wrong questions...' : 'Generating quiz...')
    setShowQuizAnswers(false)
    setQuizAnswers({})
    setQuizSummary(null)
    try {
      const result = await generateQuiz(quizFile, {
        questionCount,
        difficulty: quizDifficulty,
        retryItems,
      })
      setQuizResult(result)
      setQuizMessage(`Quiz generated from ${result.file_name}.`)
      console.log('[quiz] generation finished', {
        elapsedSeconds: ((performance.now() - startedAt) / 1000).toFixed(2),
        extractedChars: result.text_length,
      })
    } catch (err) {
      setQuizResult(null)
      setQuizMessage(err.response?.data?.detail || 'Quiz generation failed. Please try again.')
      console.error('[quiz] generation failed', {
        elapsedSeconds: ((performance.now() - startedAt) / 1000).toFixed(2),
        message: err.response?.data?.detail || err.message,
      })
    } finally {
      setQuizLoading(false)
    }
  }

  const handleQuizAnswer = (questionIndex, option) => {
    if (quizSummary) return
    setQuizAnswers((current) => ({ ...current, [questionIndex]: option }))
  }

  const handleSubmitQuiz = () => {
    const questions = quizResult?.quiz?.questions || []
    if (questions.length === 0) return

    const wrongQuestions = questions.filter((item, index) => quizAnswers[index] !== item.correct_answer)
    const correctCount = questions.length - wrongQuestions.length
    setShowQuizAnswers(true)
    setQuizSummary({
      total: questions.length,
      correct: correctCount,
      wrong: wrongQuestions.length,
      percentage: Math.round((correctCount / questions.length) * 100),
      wrongQuestions,
    })
  }

  const handleRetryWrongQuestions = async () => {
    if (!quizSummary?.wrongQuestions?.length) return
    await handleGenerateQuiz(quizSummary.wrongQuestions)
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
          activeModule={activeModule}
          onSelectModule={setActiveModule}
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

          {/* Main content area. We render only the active module. When no module is
              active we show a compact selector to pick a module. Sections animate
              with a smooth transition when switching modules. */}
          <div className="transition-all duration-500 ease-out">
            {!activeModule && (
              <section className={`rounded-3xl border p-6 shadow-xl ${panelClass}`}>
                <div className="mb-5">
                  <h2 className="text-xl font-semibold">Welcome — pick a module</h2>
                  <p className={`mt-1 text-sm ${mutedTextClass}`}>Open a focused learning module to begin.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <button
                    onClick={() => setActiveModule('quiz')}
                    className="rounded-2xl border p-4 text-left transition hover:shadow-md"
                  >
                    <div className="text-lg font-semibold">AI Quiz Generator</div>
                    <div className={`mt-1 text-sm ${mutedTextClass}`}>Create short MCQ quizzes from your notes.</div>
                  </button>
                  <button
                    onClick={() => setActiveModule('voice')}
                    className="rounded-2xl border p-4 text-left transition hover:shadow-md"
                  >
                    <div className="text-lg font-semibold">Voice-Based Learning Assistant</div>
                    <div className={`mt-1 text-sm ${mutedTextClass}`}>Ask by voice and listen to spoken responses.</div>
                  </button>
                  <button
                    onClick={() => setActiveModule('summarizer')}
                    className="rounded-2xl border p-4 text-left transition hover:shadow-md"
                  >
                    <div className="text-lg font-semibold">Study Notes Summarizer</div>
                    <div className={`mt-1 text-sm ${mutedTextClass}`}>Summarize long notes into concise study points.</div>
                  </button>
                </div>
              </section>
            )}
            {isConversationModule && activeModule && (
            <section key="conversation" className={`rounded-3xl border p-6 shadow-xl transform transition-all duration-500 ${panelClass} ${activeModule ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    {activeModule === 'voice' ? 'Voice-Based Learning Assistant' : 'Chat'}
                  </h2>
                  <p className={`mt-1 text-sm ${mutedTextClass}`}>
                    {activeModule === 'voice'
                      ? 'Ask by voice, then listen with full playback controls.'
                      : 'Your conversation history and assistant responses.'}
                  </p>
                </div>
                {loading && <span className="text-sm text-blue-300">Generating response...</span>}
              </div>
              {messages.length > 0 && (
                <div className={`mb-6 max-h-[54vh] space-y-3 overflow-y-auto rounded-3xl border p-4 ${innerPanelClass}`}>
                  {messages.map((message, index) => (
                    <ChatBubble
                      key={index}
                      sender={message.sender}
                      message={message.text}
                      theme={theme}
                      audioControls={
                        message.sender === 'assistant'
                          ? {
                              status: audioState.activeKey === index ? audioState.status : 'idle',
                              error: audioState.activeKey === index ? audioState.error : '',
                              progress: audioState.activeKey === index ? audioState.progress : 0,
                              currentTime: audioState.activeKey === index ? audioState.currentTime : 0,
                              duration: audioState.activeKey === index ? audioState.duration : 0,
                              onPlay: () => play(index, message.text),
                              onPause: pause,
                              onResume: resume,
                              onStop: stop,
                              onReplay: replay,
                            }
                          : undefined
                      }
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
              <form onSubmit={handleChatSubmit} className="space-y-4">
                {activeModule === 'chat' && (
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask a question in English, Kannada or Hindi..."
                    rows={3}
                    className={`w-full resize-none rounded-3xl border px-4 py-3 text-sm outline-none transition ${inputClass}`}
                  />
                )}
                {activeModule === 'voice' && (
                  <div className={`rounded-3xl border p-4 ${innerPanelClass}`}>
                    <div className={`text-sm font-semibold ${softTextClass}`}>Voice question</div>
                    <p className={`mt-1 text-sm ${mutedTextClass}`}>
                      Choose a language, start the microphone, and your transcript will be sent to the assistant.
                    </p>
                  </div>
                )}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    {activeModule === 'chat' && (
                      <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center justify-center rounded-3xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Send Question
                      </button>
                    )}
                    {activeModule === 'voice' && (
                      <>
                        <button
                          type="button"
                          onClick={handleVoiceInput}
                          disabled={loading || isListening}
                          className={`inline-flex items-center justify-center rounded-3xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            isListening
                              ? 'bg-red-600 text-white'
                              : isDark
                                ? 'bg-slate-800 text-slate-100 hover:bg-slate-700'
                                : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                          }`}
                        >
                          {isListening ? 'Listening...' : 'Use Microphone'}
                        </button>
                        <select
                          value={voiceLanguage}
                          onChange={(event) => setVoiceLanguage(event.target.value)}
                          className={`rounded-3xl border px-4 py-3 text-sm outline-none transition ${inputClass}`}
                          aria-label="Voice input language"
                        >
                          <option value="en">English</option>
                          <option value="hi">Hindi</option>
                          <option value="kn">Kannada</option>
                        </select>
                      </>
                    )}
                  </div>
                  {voiceMessage && <span className={`text-sm ${mutedTextClass}`}>{voiceMessage}</span>}
                </div>
              </form>
            </section>
            )}
            {activeModule === 'upload' && (
            <section key="upload" className={`rounded-3xl border p-6 shadow-xl transform transition-all duration-500 ${panelClass} ${activeModule ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
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
            {activeModule === 'quiz' && (
              <section key="quiz" className={`rounded-3xl border p-6 shadow-xl transform transition-all duration-500 ${panelClass} ${activeModule ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                <div className="mb-5">
                  <h2 className="text-xl font-semibold">AI Quiz Generator</h2>
                  <p className={`mt-1 text-sm ${mutedTextClass}`}>
                    Upload notes, choose quiz settings, answer MCQs, and retry weak areas.
                  </p>
                </div>
                <div className="space-y-4">
                  <FileUpload
                    onFileChange={(file) => {
                      setQuizFile(file)
                      setQuizResult(null)
                      setQuizMessage('')
                      setShowQuizAnswers(false)
                      setQuizAnswers({})
                      setQuizSummary(null)
                    }}
                    selectedFile={quizFile}
                    theme={theme}
                    title="Upload notes for quiz"
                    hint="PDF, DOCX, TXT"
                    accept=".pdf,.docx,.txt"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className={`text-sm ${softTextClass}`}>
                      Questions
                      <select
                        value={quizQuestionCount}
                        onChange={(event) => setQuizQuestionCount(Number(event.target.value))}
                        className={`mt-2 w-full rounded-2xl border px-4 py-3 outline-none ${inputClass}`}
                      >
                        <option value={2}>2 questions</option>
                        <option value={3}>3 questions</option>
                        <option value={5}>5 questions</option>
                      </select>
                    </label>
                    <label className={`text-sm ${softTextClass}`}>
                      Difficulty
                      <select
                        value={quizDifficulty}
                        onChange={(event) => setQuizDifficulty(event.target.value)}
                        className={`mt-2 w-full rounded-2xl border px-4 py-3 outline-none ${inputClass}`}
                      >
                        <option>Easy</option>
                        <option>Medium</option>
                        <option>Hard</option>
                      </select>
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => handleGenerateQuiz()}
                      disabled={!quizFile || quizLoading}
                      className="rounded-3xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {quizLoading ? 'Generating...' : quizResult ? 'Regenerate Quiz' : 'Generate Quiz'}
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitQuiz}
                      disabled={!quizResult || quizSummary}
                      className={`rounded-3xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        isDark ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                      }`}
                    >
                      Submit Quiz
                    </button>
                  </div>
                  {quizMessage && <p className={`text-sm ${softTextClass}`}>{quizMessage}</p>}
                  {quizLoading && (
                    <div className={`flex items-center gap-3 rounded-2xl border p-4 text-sm ${innerPanelClass}`}>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                      <span className={softTextClass}>Creating a short MCQ quiz from a shortened notes excerpt...</span>
                    </div>
                  )}
                  {quizSummary && (
                    <div className={`rounded-2xl border p-4 ${innerPanelClass}`}>
                      <div className="text-lg font-semibold">Quiz complete</div>
                      <div className={`mt-3 grid grid-cols-3 gap-3 text-sm ${softTextClass}`}>
                        <div><span className="block text-2xl font-bold text-blue-400">{quizSummary.percentage}%</span>Score</div>
                        <div><span className="block text-2xl font-bold text-green-400">{quizSummary.correct}</span>Correct</div>
                        <div><span className="block text-2xl font-bold text-red-400">{quizSummary.wrong}</span>Wrong</div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRetryWrongQuestions}
                        disabled={!quizSummary.wrong || quizLoading}
                        className="mt-4 w-full rounded-3xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Retry Wrong Questions
                      </button>
                    </div>
                  )}
                  {quizResult?.quiz?.questions?.length > 0 && (
                    <div className={`space-y-4 rounded-2xl border p-4 ${innerPanelClass}`}>
                      {quizResult.quiz.questions.map((item, questionIndex) => (
                        <div key={`${item.question}-${questionIndex}`} className="space-y-3">
                          <div className={`text-sm font-semibold ${softTextClass}`}>
                            {questionIndex + 1}. {item.question}
                          </div>
                          <div className="space-y-2">
                            {item.options.map((option, optionIndex) => {
                              const isCorrect = showQuizAnswers && option === item.correct_answer
                              const isSelectedWrong = showQuizAnswers && quizAnswers[questionIndex] === option && option !== item.correct_answer
                              return (
                                <button
                                  type="button"
                                  key={`${option}-${optionIndex}`}
                                  onClick={() => handleQuizAnswer(questionIndex, option)}
                                  className={`w-full rounded-2xl border px-3 py-2 text-left text-sm transition ${
                                    isCorrect
                                      ? isDark
                                        ? 'border-green-500 bg-green-500/10 text-green-200'
                                        : 'border-green-500 bg-green-50 text-green-800'
                                      : isSelectedWrong
                                        ? 'border-red-500 bg-red-500/10 text-red-300'
                                        : quizAnswers[questionIndex] === option
                                          ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                                      : isDark
                                        ? 'border-slate-800 text-slate-300'
                                        : 'border-slate-200 text-slate-700'
                                  }`}
                                >
                                  {String.fromCharCode(65 + optionIndex)}. {option}
                                </button>
                              )
                            })}
                          </div>
                          {showQuizAnswers && (
                            <div className="text-sm font-semibold text-green-300">
                              Answer: {item.correct_answer}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}
            {/* Provide a simple back button when a module is open so users can return
                to the module selector without using the sidebar. */}
            {activeModule && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setActiveModule(null)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${isDark ? 'bg-slate-800 text-slate-100' : 'bg-slate-100 text-slate-900'}`}
                >
                  Back to modules
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default Dashboard
