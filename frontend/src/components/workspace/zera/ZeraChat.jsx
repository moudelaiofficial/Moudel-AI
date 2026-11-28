
import { useState } from 'react'
import {
  ArrowUp,
  LoaderCircle,
  Sparkles,
  BookOpen,
  Search,
  MessageSquare,
  Library,
  ArrowDown,
  Command,
} from 'lucide-react'

import { sendZeraMessage } from '../../../api/zera.js'
import ZeraMessage from './ZeraMessage.jsx'
import PaperCard from './PaperCard.jsx'

const suggestions = [
  {
    category: 'Language models',
    title: 'What are the latest trends in large language models?',
  },
  {
    category: 'Research methods',
    title: 'How has retrieval-augmented generation evolved?',
  },
  {
    category: 'Artificial intelligence',
    title: 'What are the recent developments in multimodal AI?',
  },
  {
    category: 'Emerging research',
    title: 'Find research on AI agents and tool use.',
  },
]

export default function ZeraChat() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const latestAssistant = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant')

  const totalSources = latestAssistant?.sources?.length ?? 0

  async function handleSend(value = input) {
    const question = value.trim()

    if (!question || loading) return

    setInput('')
    setError('')
    setLoading(true)

    setMessages((current) => [
      ...current,
      {
        role: 'user',
        content: question,
      },
    ])

    try {
      const result = await sendZeraMessage(question)

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: result.answer,
          sources: result.sources ?? [],
          research: result.research,
        },
      ])
    } catch (err) {
      setError(
        err.message || 'Something went wrong. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    handleSend()
  }

  return (
    <main className="min-h-[calc(100vh-72px)] bg-[#f7f4ec] text-[#292720]">
      {/* Editorial page heading */}
      <div className="border-b border-[#ded7c9]">
        <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <div className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#827968]">
                <Sparkles size={13} className="text-[#8067b9]" />
                Moudel / Research workspace
              </div>

              <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">
                Research with{' '}
                <span className="italic text-[#7058b2]">ZERA.</span>
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-7 text-[#777064]">
                Explore literature, connect ideas and discover
                knowledge through evidence-grounded research.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start border border-[#ded7c9] bg-[#fffdf8] px-3 py-2 sm:self-auto">
              <span className="h-1.5 w-1.5 rounded-full bg-[#8baf91]" />
              <span className="text-[10px] font-medium uppercase tracking-[0.13em] text-[#777064]">
                Research assistant
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Workspace */}
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_290px] lg:gap-12 lg:px-12">

        {/* Main research conversation */}
        <section className="flex min-w-0 flex-col">
          <div className="mb-6 flex items-center justify-between border-b border-[#ded7c9] pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare size={14} className="text-[#8067b9]" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#827968]">
                Research conversation
              </span>
            </div>

            <span className="text-[10px] text-[#999080]">
              {messages.filter((message) => message.role === 'user').length} questions
            </span>
          </div>

          {messages.length === 0 ? (
            <div className="flex-1">
              <div className="py-10 sm:py-16">
                <p className="mb-4 text-xs italic text-[#8c8170]">
                  Your next discovery begins here.
                </p>

                <h2 className="max-w-xl font-serif text-3xl leading-tight sm:text-4xl">
                  What would you like to
                  <span className="italic text-[#7058b2]"> investigate?</span>
                </h2>

                <p className="mt-4 max-w-lg text-sm leading-7 text-[#777064]">
                  Ask a question, explore a research direction or
                  investigate connections across different disciplines.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.title}
                    type="button"
                    onClick={() => handleSend(suggestion.title)}
                    disabled={loading}
                    className="group border border-[#ded7c9] bg-[#fffdf8] p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[#b9a8df] hover:bg-[#f0ebf8] disabled:opacity-50"
                  >
                    <div className="mb-5 flex items-center justify-between">
                      <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#958a7a]">
                        {suggestion.category}
                      </span>

                      <span className="font-serif text-sm text-[#a69a89]">
                        0{index + 1}
                      </span>
                    </div>

                    <p className="font-serif text-lg leading-7 text-[#39352e] transition-colors group-hover:text-[#60489f]">
                      {suggestion.title}
                    </p>

                    <div className="mt-5 flex items-center justify-end">
                      <ArrowUp size={15} className="rotate-45 text-[#8067b9] transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 space-y-8">
              {messages.map((message, index) => (
                <div key={index} className="space-y-5">
                  <ZeraMessage message={message} />

                  {message.role === 'assistant' && (
                    <div className="ml-0 sm:ml-5">
                      {message.research && (
                        <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-[#ded7c9] py-3 text-[10px] uppercase tracking-[0.12em] text-[#8a8071]">
                          <span>
                            Retrieved{' '}
                            <strong className="font-semibold text-[#57458b]">
                              {message.research.total_found ?? message.research.retrieved ?? 0}
                            </strong>
                          </span>

                          <span>
                            Analysed{' '}
                            <strong className="font-semibold text-[#57458b]">
                              {message.research.analysed ?? 0}
                            </strong>
                          </span>

                          {message.research.corpus_retrieved != null && (
                            <span>
                              Corpus{' '}
                              <strong className="font-semibold text-[#57458b]">
                                {message.research.corpus_retrieved}
                              </strong>
                            </span>
                          )}
                        </div>
                      )}

                      {message.sources?.length > 0 && (
                        <details className="group overflow-hidden border border-[#ded7c9] bg-[#fffdf8]" open>
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition hover:bg-[#f2eee5] sm:px-6">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eee9f8] text-[#7058b2]">
                                <BookOpen size={16} />
                              </div>

                              <div>
                                <h3 className="font-serif text-lg">
                                  Research library
                                </h3>

                                <p className="mt-0.5 text-[10px] text-[#8a8071]">
                                  {message.sources.length} supporting papers
                                </p>
                              </div>
                            </div>

                            <ArrowDown size={15} className="text-[#8a8071] transition-transform group-open:rotate-180" />
                          </summary>

                          <div className="border-t border-[#ded7c9] px-5 sm:px-6">
                            {message.sources.map((paper, paperIndex) => (
                              <PaperCard
                                key={paper.id || paper.openalex_id || paperIndex}
                                paper={paper}
                                index={paperIndex + 1}
                              />
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-3 border border-[#ded7c9] bg-[#fffdf8] px-5 py-4 text-sm text-[#827968]">
                  <LoaderCircle size={17} className="animate-spin text-[#8067b9]" />
                  <span className="font-serif italic">
                    Exploring literature and connecting research...
                  </span>
                </div>
              )}

              <div />
            </div>
          )}

          {error && (
            <div className="mt-5 border border-[#e4c7c1] bg-[#fbefec] px-4 py-3 text-sm text-[#9c5146]">
              {error}
            </div>
          )}

          {/* Composer */}
          <form
            onSubmit={handleSubmit}
            className="sticky bottom-0 z-10 mt-10 border border-[#d8d0c2] bg-[#fffdf8] shadow-[0_8px_28px_rgba(45,38,28,0.06)]"
          >
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Ask a research question..."
              rows={2}
              disabled={loading}
              className="w-full resize-none bg-transparent px-5 py-4 font-serif text-base leading-7 text-[#39352e] outline-none placeholder:italic placeholder:text-[#aaa092] disabled:opacity-50"
            />

            <div className="flex items-center justify-between border-t border-[#e8e1d5] px-4 py-3">
              <div className="flex items-center gap-2 text-[10px] text-[#958a7a]">
                <Command size={12} />
                <span>Enter to send · Shift + Enter for new line</span>
              </div>

              <button
                type="submit"
                disabled={!input.trim() || loading}
                aria-label="Send research question"
                className="flex h-9 w-9 items-center justify-center bg-[#292720] text-white transition hover:bg-[#7058b2] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowUp size={17} />
              </button>
            </div>
          </form>

          <p className="mt-3 text-center text-[10px] text-[#a19889]">
            ZERA generates research insights grounded in retrieved academic abstracts.
          </p>
        </section>

        {/* Contextual research panel */}
        <aside className="hidden lg:block">
          <div className="sticky top-8 space-y-7">
            <section className="border border-[#ded7c9] bg-[#fffdf8] p-5">
              <div className="mb-5 flex items-center gap-2">
                <Library size={15} className="text-[#8067b9]" />
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#827968]">
                  Research desk
                </h3>
              </div>

              <p className="font-serif text-2xl">
                {messages.length === 0 ? 'An open field.' : 'Your inquiry.'}
              </p>

              <p className="mt-2 text-xs leading-6 text-[#827968]">
                {messages.length === 0
                  ? 'Begin with a question. ZERA will explore the literature and bring relevant research into your workspace.'
                  : 'Your conversation is exploring research through the shared literature collection.'}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="border-t border-[#ded7c9] pt-3">
                  <p className="font-serif text-2xl">
                    {messages.filter((message) => message.role === 'user').length}
                  </p>
                  <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-[#958a7a]">
                    Questions
                  </p>
                </div>

                <div className="border-t border-[#ded7c9] pt-3">
                  <p className="font-serif text-2xl">
                    {totalSources}
                  </p>
                  <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-[#958a7a]">
                    Latest sources
                  </p>
                </div>
              </div>
            </section>

            <section className="border-t border-[#ded7c9] pt-5">
              <div className="mb-4 flex items-center gap-2">
                <Search size={14} className="text-[#8067b9]" />
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#827968]">
                  Explore disciplines
                </h3>
              </div>

              <div className="space-y-0">
                {[
                  'Artificial intelligence',
                  'Machine learning',
                  'Language models',
                  'Computer science',
                  'Cybersecurity',
                  'Engineering & IoT',
                ].map((topic, index) => (
                  <div
                    key={topic}
                    className="flex items-center justify-between border-b border-[#e6dfd3] py-3 text-sm text-[#625b50]"
                  >
                    <span>{topic}</span>
                    <span className="font-serif text-xs text-[#a69a89]">
                      0{index + 1}
                    </span>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-[10px] leading-5 text-[#a19889]">
                Research areas are illustrative. ZERA discovers relevant
                disciplines dynamically from your questions.
              </p>
            </section>

            <section className="bg-[#ece7f5] p-5">
              <Sparkles size={17} className="text-[#7058b2]" />

              <h3 className="mt-3 font-serif text-xl text-[#42345f]">
                Follow the evidence.
              </h3>

              <p className="mt-2 text-xs leading-6 text-[#716488]">
                Explore connections across papers, disciplines and
                emerging research directions.
              </p>
            </section>
          </div>
        </aside>
      </div>
    </main>
  )
}
