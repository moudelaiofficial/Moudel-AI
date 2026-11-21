import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  CornerDownRight,
  FileText,
  FolderOpen,
  Languages,
  History,
  Link2,
  Menu,
  Pencil,
  Search,
  Tag,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import SEO from '../../components/SEO.jsx'
/* ------------------------------------------------------------------ */
/* Moudel Research Journal                                             */
/* paper #f6f2e8 · sheet #fffdf8 · ink #1c1b19 · rule #d9d2bf          */
/* violet #5b3fc4 · sage #5f7a6a                                        */
/* ------------------------------------------------------------------ */

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5b3fc4]'
const ease = 'transition-colors duration-150 motion-reduce:transition-none'

const primaryBtn = `inline-flex items-center justify-center gap-2 rounded-full bg-[#1c1b19] px-7 py-4 text-sm font-medium text-white hover:bg-[#3b3830] ${ease} ${focusRing}`
const textLink = `inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-[#1c1b19] underline decoration-[#bfb7a0] decoration-1 underline-offset-[6px] hover:decoration-[#5b3fc4] ${ease} ${focusRing}`
const navLinkCls = `rounded-sm px-2.5 py-1 text-[13px] text-[#5f5b50] hover:text-[#1c1b19] ${ease} ${focusRing}`


/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

const navItems = [
  { label: 'Product', href: '#product' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Workspace', href: '#workspace' },
  { label: 'About', href: '#about' },
]

const topics = ['Climate science', 'Medical AI', 'Language models']

const sampleSets = {
  language: {
    note: 'Evidence selection may matter as much as context length.',
    collection: 'Long-context research',
    papers: [
      {
        title: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks',
        authors: 'Lewis et al.',
        year: '2020',
        relation: 'foundational method',
      },
      {
        title: 'Lost in the Middle: How Language Models Use Long Contexts',
        authors: 'Liu et al.',
        year: '2024',
        relation: 'tests long inputs',
      },
      {
        title: 'Dense Passage Retrieval for Open-Domain Question Answering',
        authors: 'Karpukhin et al.',
        year: '2020',
        relation: 'retrieval component',
      },
      {
        title: 'Longformer: The Long-Document Transformer',
        authors: 'Beltagy, Peters, Cohan',
        year: '2020',
        relation: 'long-document attention',
      },
    ],
  },
  climate: {
    note: 'Compare learned forecasters with physics-based baselines.',
    collection: 'Climate forecasting',
    papers: [
      {
        title: 'Tackling Climate Change with Machine Learning',
        authors: 'Rolnick et al.',
        year: '2022',
        relation: 'broad overview',
      },
      {
        title: 'Deep Learning and Process Understanding for Data-Driven Earth System Science',
        authors: 'Reichstein et al.',
        year: '2019',
        relation: 'hybrid modelling',
      },
      {
        title: 'FourCastNet: A Global Data-Driven High-Resolution Weather Model',
        authors: 'Pathak et al.',
        year: '2022',
        relation: 'learned forecasting',
      },
      {
        title: 'Learning Skillful Medium-Range Global Weather Forecasting',
        authors: 'Lam et al.',
        year: '2023',
        relation: 'medium-range forecasts',
      },
    ],
  },
  medical: {
    note: 'Check how each study was validated against clinicians.',
    collection: 'Clinical AI review',
    papers: [
      {
        title: 'Dermatologist-Level Classification of Skin Cancer with Deep Neural Networks',
        authors: 'Esteva et al.',
        year: '2017',
        relation: 'image classification',
      },
      {
        title: 'Clinically Applicable Deep Learning for Diagnosis and Referral in Retinal Disease',
        authors: 'De Fauw et al.',
        year: '2018',
        relation: 'referral decisions',
      },
      {
        title: 'Development and Validation of a Deep Learning Algorithm for Detection of Diabetic Retinopathy',
        authors: 'Gulshan et al.',
        year: '2016',
        relation: 'screening study',
      },
      {
        title: 'Large Language Models Encode Clinical Knowledge',
        authors: 'Singhal et al.',
        year: '2023',
        relation: 'clinical questions',
      },
    ],
  },
}

function matchTopic(query) {
  const q = query.toLowerCase()
  if (/climate|weather|carbon|earth|emission/.test(q)) return 'climate'
  if (/medic|clinic|health|disease|cancer|diagnos|patient/.test(q)) return 'medical'
  if (/language|llm|nlp|retriev|transformer|gpt|generation|context/.test(q)) return 'language'
  return null
}

/* Positions are percentages of a 1000 x 640 canvas (large screens). */
const slots = [
  { x: 16, y: 18.75, path: 'M160 120 C330 120 340 290 500 290', lx: 33, ly: 31.5 },
  { x: 84, y: 17.2, path: 'M840 110 C670 110 660 290 500 290', lx: 67, ly: 30.5 },
  { x: 14, y: 67.2, path: 'M140 430 C320 430 340 290 500 290', lx: 31, ly: 56 },
  { x: 86, y: 68.75, path: 'M860 440 C680 440 660 290 500 290', lx: 69, ly: 57 },
]

const progression = [
  {
    label: 'Question',
    session: 'Session 1',
    body: (
      <p className="font-serif text-2xl leading-snug text-[#1c1b19]">
        How does retrieval affect long-context reasoning?
      </p>
    ),
  },
  {
    label: 'Sources',
    session: 'Session 1',
    body: (
      <div>
        <p className="font-serif text-xl leading-snug text-[#1c1b19]">
          Lost in the Middle: How Language Models Use Long Contexts
        </p>
        <p className="mt-2 text-xs text-[#8a8573]">Liu et al. · 2024</p>
      </div>
    ),
  },
  {
    label: 'Notes',
    session: 'Session 2',
    body: (
      <p className="font-serif text-xl italic leading-snug text-[#3f2b94]">
        Evidence selection may matter as much as context length.
      </p>
    ),
  },
  {
    label: 'Next direction',
    session: 'Session 3',
    body: (
      <p className="font-serif text-xl leading-snug text-[#1c1b19]">
        Compare retrieval-based and long-context approaches.
      </p>
    ),
  },
]

const workspacePapers = [
  {
    n: 1,
    title: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks',
    meta: 'Lewis et al. · 2020',
    summary: 'Grounds generation in retrieved documents rather than model memory alone.',
  },
  {
    n: 2,
    title: 'Lost in the Middle: How Language Models Use Long Contexts',
    meta: 'Liu et al. · 2024',
    summary: 'Shows uneven use of information depending on where it sits in a long input.',
    note: true,
  },
  {
    n: 3,
    title: 'Dense Passage Retrieval for Open-Domain Question Answering',
    meta: 'Karpukhin et al. · 2020',
    summary: 'Learns dense representations for finding relevant passages.',
  },
]

const features = [
  {
    n: '01',
    title: 'Discover relevant research.',
    text: 'Begin with a question in plain language and see which papers bear on it, with enough context to decide what to read.',
    detail: (
      <div className="border-b border-[#1c1b19] pb-2">
        <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[#8a8573]">
          <Search size={12} aria-hidden="true" /> Question
        </p>
        <p className="mt-1 font-serif text-lg text-[#1c1b19]">
          How does retrieval affect long-context reasoning?
        </p>
      </div>
    ),
  },
  {
    n: '02',
    title: 'Save papers to collections.',
    text: 'Give each line of inquiry a home, so useful papers stay together instead of scattering across tabs and downloads.',
    detail: (
      <div className="flex items-center gap-3 border border-[#5f7a6a] px-3 py-2.5">
        <FolderOpen size={16} className="shrink-0 text-[#5f7a6a]" aria-hidden="true" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[#1c1b19]">Long-context research</p>
          <p className="text-xs text-[#5f5b50]">3 sources saved</p>
        </div>
      </div>
    ),
  },
  {
    n: '03',
    title: 'Keep notes and tags with sources.',
    text: 'Write down what you understood while it is fresh, and label it so related ideas can find each other later.',
    detail: (
      <div>
        <p className="text-sm font-medium text-[#1c1b19]">Lost in the Middle · 2024</p>
        <p className="mt-2 border-l-2 border-[#5b3fc4] pl-3 font-serif text-base italic text-[#3f2b94]">
          Evidence selection may matter as much as context length.
        </p>
        <div className="mt-2 flex gap-1.5">
          <Chip tone="sage">Evaluation</Chip>
          <Chip tone="sage">Retrieval</Chip>
        </div>
      </div>
    ),
  },
  {
    n: '04',
    title: 'Return with context.',
    text: 'Come back to the question, the sources, and the thinking around them, instead of rebuilding the trail from memory.',
    detail: (
      <div>
        <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[#8a8573]">
          <History size={12} aria-hidden="true" /> Pick up where you left off
        </p>
        <p className="mt-1 font-serif text-lg text-[#1c1b19]">
          Compare retrieval-based and long-context approaches.
        </p>
      </div>
    ),
  },
]

const ledger = [
  { name: 'Authentication, collections and saved-paper APIs', status: 'Implemented' },
  { name: 'Paper de-duplication, user-scoped access and rate limits', status: 'Implemented' },
  { name: 'ZERA backend chat proxy', status: 'Implemented' },
  { name: 'Unified PubMed, OpenAlex and arXiv discovery', status: 'In progress' },
  { name: 'Persistent editor and research workspace', status: 'In progress' },
  { name: 'ZERA chat panel in the frontend', status: 'In progress' },
  { name: 'Malayalam query and response translation', status: 'In progress' },
  { name: 'Explain Simply and chat with my collection', status: 'Planned' },
]
/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

function BrandMark({ size = 32 }) {
  return (
    <img
      src="/moudel-favicon.png"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      className="shrink-0 object-contain"
      onError={(event) => {
        event.currentTarget.style.display = 'none'
      }}
    />
  )
}

function Brand() {
  return (
    <Link
      to="/"
      aria-label="Moudel AI home"
      className={`inline-flex items-center gap-2 rounded-sm ${focusRing}`}
    >
      <BrandMark />
      <span className="font-serif text-lg tracking-tight text-[#1c1b19]">
        Moudel<span className="text-[#5b3fc4]"></span>
      </span>
    </Link>
  )
}

function Meta({ children, className = '' }) {
  return (
    <p
      className={`text-[11px] font-medium uppercase tracking-[0.18em] text-[#8a8573] ${className}`}
    >
      {children}
    </p>
  )
}

/* Important modifiers keep headings immune to any global h1/h2 rules. */
function Heading({ as: Tag = 'h2', tight = false, className = '', children, ...props }) {
  return (
    <Tag
      className={`m-0! font-serif! font-normal! text-[#1c1b19]! ${
        tight ? 'tracking-[-0.035em]!' : 'tracking-[-0.015em]!'
      } ${className}`}
      {...props}
    >
      {children}
    </Tag>
  )
}

function Chip({ children, tone = 'violet' }) {
  const tones = {
    violet: 'bg-[#ece8fa] text-[#3f2b94]',
    sage: 'bg-[#e4ebe3] text-[#3f5a4b]',
    plain: 'border border-[#d9d2bf] text-[#5f5b50]',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] ${tones[tone]}`}>
      {children}
    </span>
  )
}

function Cite({ n }) {
  return (
    <span className="mx-0.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-sm bg-[#ece8fa] px-1 text-[11px] font-medium text-[#3f2b94]">
      {n}
    </span>
  )
}

/* A rule with a violet node, used to open the page and to close it. */
function ThreadRule() {
  return (
    <div className="relative border-t border-[#1c1b19]" aria-hidden="true">
      <span className="absolute -top-[5px] left-0 size-[9px] rounded-full bg-[#5b3fc4]" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Navigation: full-width site header                                  */
/* ------------------------------------------------------------------ */

function Header() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const close = () => setOpen(false)

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#d9d2bf] bg-[#f6f2e8]">
      <div className="mx-auto flex h-[72px] w-full max-w-[1400px] items-center justify-between gap-6 px-4 sm:px-8">
        {/* Logo: far left */}
        <div className="flex items-center md:flex-1">
          <Brand />
        </div>

        {/* Links: middle */}
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className={navLinkCls}>
              {item.label}
            </a>
          ))}
        </nav>

        {/* Log in / Get started: far right */}
        <div className="hidden items-center justify-end gap-3 md:flex md:flex-1">
          <Link to="/login" className={navLinkCls}>
            {'Log in'}
          </Link>
          <Link
            to="/signup"
            className={`rounded-full bg-[#1c1b19] px-5 py-2.5 text-[13px] font-medium text-white hover:bg-[#3b3830] ${ease} ${focusRing}`}
          >
            {'Get started'}
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          className={`grid size-10 place-items-center rounded-full border border-[#d9d2bf] text-[#1c1b19] hover:bg-[#ece6d6] md:hidden ${ease} ${focusRing}`}
        >
          {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
        </button>
      </div>

      {open && (
        <nav
          id="mobile-menu"
          aria-label="Mobile"
          className="border-t border-[#d9d2bf] bg-[#f6f2e8] px-4 pb-5 pt-2 sm:px-8 md:hidden"
        >
          <ul>
            {[...navItems, { label: 'Log in', to: '/login' }].map((item) => (
              <li key={item.label} className="border-b border-[#e8e2d1]">
                {item.to ? (
                  <Link
                    to={item.to}
                    onClick={close}
                    className={`block py-3.5 text-base text-[#1c1b19] ${focusRing}`}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <a
                    href={item.href}
                    onClick={close}
                    className={`block py-3.5 text-base text-[#1c1b19] ${focusRing}`}
                  >
                    {item.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
          <Link to="/signup" onClick={close} className={`${primaryBtn} mt-5 w-full`}>
            Get started
          </Link>
        </nav>
      )}
    </header>
  )
}

/* ------------------------------------------------------------------ */
/* Hero: scale, asymmetry, and a small research artifact               */
/* ------------------------------------------------------------------ */

function HeroCluster() {
  const papers = [
    { n: 1, title: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks', meta: 'Lewis et al. · 2020' },
    { n: 2, title: 'Lost in the Middle: How Language Models Use Long Contexts', meta: 'Liu et al. · 2024' },
    { n: 3, title: 'Dense Passage Retrieval for Open-Domain Question Answering', meta: 'Karpukhin et al. · 2020' },
  ]
  return (
    <div>
      <Meta>Sources for Nº 1</Meta>
      <div className="mt-5 grid gap-8 sm:grid-cols-[minmax(0,1fr)_13rem] sm:gap-10">
        <ol className="relative ml-1.5 space-y-6 border-l border-[#bfb7a0] pl-6">
          {papers.map((paper) => (
            <li key={paper.n} className="relative">
              <span
                aria-hidden="true"
                className="absolute -left-[29px] top-2 size-[7px] rounded-full bg-[#5b3fc4]"
              />
              <p className="font-serif text-lg leading-snug text-[#1c1b19]">{paper.title}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-[#8a8573]">
                <Cite n={paper.n} /> {paper.meta}
              </p>
            </li>
          ))}
        </ol>

        <div className="sm:self-center sm:-rotate-2">
          <p className="font-serif text-lg italic leading-snug text-[#3f2b94]">
            Evidence selection may matter as much as context length.
          </p>
          <p className="mt-2 flex items-center gap-1 text-xs text-[#5f5b50]">
            <CornerDownRight size={12} aria-hidden="true" /> see <Cite n={2} />
          </p>
        </div>
      </div>

      <div className="mt-8 inline-flex items-center gap-2.5 border border-[#5f7a6a] bg-[#e4ebe3] px-3.5 py-2 text-sm text-[#3f5a4b]">
        <FolderOpen size={15} aria-hidden="true" />
        <span>
          Collection <span className="mx-1 text-[#5f7a6a]">·</span>
          <span className="font-medium">Long-context research</span>
        </span>
      </div>
    </div>
  )
}

function Hero() {
  return (
    <section className="px-4 pb-20 pt-10 sm:px-8 lg:pb-28 lg:pt-14">
      <div className="mx-auto max-w-[1400px]">
        <ThreadRule />
        <Meta className="mt-4">{'Moudel Research Journal · Nº 01 · Building in public'}</Meta>

        <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-8">
          <Heading
            as="h1"
            tight
            className="text-[clamp(2.5rem,9vw,8rem)]! leading-[0.96]! lg:col-span-9"
          >
            <span className="block">{'Research is'}</span>
            <span className="block lg:pl-[12%]">
              <em className="text-[#5b3fc4]!">{'more than'}</em>
            </span>
            <span className="block">{'finding answers.'}</span>
          </Heading>

          <aside className="lg:col-span-3 lg:pt-6">
            <Meta>Question Nº 1</Meta>
            <p className="mt-3 border-t border-[#1c1b19] pt-4 font-serif text-2xl leading-snug text-[#1c1b19]">
              How does retrieval affect long-context reasoning?
            </p>
            <p className="mt-4 text-xs leading-5 text-[#5f5b50]">
              One question, with its sources, a note, and a collection to hold them.
            </p>
          </aside>
        </div>

        <div className="mt-16 grid gap-14 lg:mt-20 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <p className="max-w-sm text-lg leading-8 text-[#3b3830]">
              {'Moudel brings your research questions, papers and ideas together in one workspace.'}
            </p>
            <div className="mt-8 flex flex-col items-start gap-5">
              <Link to="/signup" className={primaryBtn}>
                {'Explore Moudel'} <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <a href="#how-it-works" className={textLink}>
                {'Explore the workflow'} <ArrowRight size={14} aria-hidden="true" />
              </a>
            </div>
            <p className="mt-8 text-xs text-[#8a8573]">
              {'Product preview. Features are being integrated in stages.'}
            </p>
          </div>

          <div className="lg:col-span-7 lg:col-start-6">
            <HeroCluster />
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Constellation: the interactive discovery canvas                     */
/* ------------------------------------------------------------------ */

function TopicButtons({ onPick, active }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs text-[#8a8573]">Try</span>
      {topics.map((topic) => (
        <button
          key={topic}
          type="button"
          onClick={() => onPick(topic)}
          aria-pressed={active === topic}
          className={`rounded-full border px-3 py-1.5 text-xs ${ease} ${focusRing} ${
            active === topic
              ? 'border-[#5b3fc4] bg-[#ece8fa] text-[#3f2b94]'
              : 'border-[#d9d2bf] text-[#5f5b50] hover:border-[#5b3fc4]/50 hover:bg-[#f1ecfb]'
          }`}
        >
          {topic}
        </button>
      ))}
    </div>
  )
}

const nodePos = 'lg:absolute lg:-translate-x-1/2 lg:-translate-y-1/2'

function Constellation() {
  const initial = 'How does retrieval affect long-context reasoning?'
  const [query, setQuery] = useState(initial)
  const [submitted, setSubmitted] = useState(initial)

  const key = useMemo(() => (submitted.trim() ? matchTopic(submitted) : null), [submitted])
  const set = key ? sampleSets[key] : null
  const activeTopic = topics.includes(submitted) ? submitted : null

  function handleSubmit(event) {
    event.preventDefault()
    setSubmitted(query.trim())
  }

  function pickTopic(topic) {
    setQuery(topic)
    setSubmitted(topic)
  }

  return (
    <section
      id="product"
      aria-labelledby="product-title"
      className="scroll-mt-4 border-y border-[#d9d2bf] bg-[#fbf9f3] px-4 py-20 sm:px-8 sm:py-28"
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <Meta>Product · Discovery</Meta>
            <Heading
              id="product-title"
              className="mt-4! max-w-2xl text-[clamp(2rem,5vw,3.75rem)]! leading-[1.08]!"
            >
              Start with a question. See what gathers around it.
            </Heading>
          </div>
          <p className="max-w-xs border-l-2 border-[#5b3fc4] pl-4 text-xs leading-5 text-[#5f5b50]">
            Sample results are illustrative. This preview runs in your browser and is not a live
            search.
          </p>
        </div>

        <div className="relative mt-14 flex flex-col gap-8 lg:mt-16 lg:block lg:h-[640px]">
          {/* Connecting lines (large screens) */}
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
            viewBox="0 0 1000 640"
            preserveAspectRatio="none"
            fill="none"
          >
            {set &&
              slots.map((slot, i) => (
                <path
                  key={i}
                  d={slot.path}
                  stroke="#bfb7a0"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            {set && (
              <>
                <path
                  d="M500 290 C500 400 400 440 400 560"
                  stroke="#5b3fc4"
                  strokeOpacity="0.55"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d="M400 560 C560 560 640 585 800 585"
                  stroke="#5f7a6a"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  vectorEffect="non-scaling-stroke"
                />
              </>
            )}
          </svg>

          {/* Centre: the question, and the entry point */}
          <div
            className={`${nodePos} z-10 border border-[#1c1b19] bg-[#fffdf8] p-5 lg:left-1/2 lg:top-[45.3%] lg:w-[25rem]`}
          >
            <form onSubmit={handleSubmit} role="search" aria-label="Research preview search">
              <label
                htmlFor="journal-query"
                className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#5b3fc4]"
              >
                <Search size={13} aria-hidden="true" /> Start here · your question
              </label>
              <input
                id="journal-query"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What do you want to understand?"
                autoComplete="off"
                className={`mt-3 w-full rounded-none border-0 border-b-2 border-[#1c1b19] bg-transparent px-0 py-2 font-serif text-xl text-[#1c1b19] placeholder:text-[#a8a38f] focus:border-[#5b3fc4] ${focusRing}`}
              />
              <button type="submit" className={`${primaryBtn} mt-4 w-full !py-3`}>
                Explore <ArrowRight size={15} aria-hidden="true" />
              </button>
            </form>
            <div className="mt-4">
              <TopicButtons onPick={pickTopic} active={activeTopic} />
            </div>
            <p aria-live="polite" className="mt-4 break-words text-xs leading-5 text-[#5f5b50]">
              {set
                ? `Illustrative sample for “${submitted}”.`
                : submitted
                  ? `No sample for “${submitted}” in this preview.`
                  : 'Type a question or choose a topic to begin.'}
            </p>
          </div>

          {set ? (
            <>
              {set.papers.map((paper, i) => {
                const slot = slots[i]
                return (
                  <div
                    key={paper.title}
                    style={{ '--x': `${slot.x}%`, '--y': `${slot.y}%` }}
                    className={`${nodePos} bg-[#fbf9f3] max-lg:ml-2 max-lg:border-l max-lg:border-[#bfb7a0] max-lg:pl-5 lg:left-[var(--x)] lg:top-[var(--y)] lg:w-[15rem] lg:border-t lg:border-[#1c1b19] lg:pt-3`}
                  >
                    <p className="flex items-center gap-1.5 text-[11px] text-[#5b3fc4] lg:hidden">
                      <CornerDownRight size={12} aria-hidden="true" /> {paper.relation}
                    </p>
                    <p className="font-serif text-base leading-snug text-[#1c1b19] max-lg:mt-1">
                      {paper.title}
                    </p>
                    <p className="mt-1.5 text-xs text-[#8a8573]">
                      {paper.authors} · {paper.year}
                    </p>
                  </div>
                )
              })}

              {/* Relationship labels on the lines (large screens) */}
              {set.papers.map((paper, i) => (
                <span
                  key={`label-${paper.title}`}
                  style={{ left: `${slots[i].lx}%`, top: `${slots[i].ly}%` }}
                  className="absolute z-[5] hidden -translate-x-1/2 -translate-y-1/2 bg-[#fbf9f3] px-1.5 text-[11px] italic text-[#5f5b50] lg:block"
                >
                  {paper.relation}
                </span>
              ))}
              <span
                style={{ left: '45.5%', top: '67%' }}
                className="absolute z-[5] hidden -translate-x-1/2 -translate-y-1/2 bg-[#fbf9f3] px-1.5 text-[11px] italic text-[#3f2b94] lg:block"
              >
                leads to
              </span>
              <span
                style={{ left: '61%', top: '89.5%' }}
                className="absolute z-[5] hidden -translate-x-1/2 -translate-y-1/2 bg-[#fbf9f3] px-1.5 text-[11px] italic text-[#3f5a4b] lg:block"
              >
                filed in
              </span>

              {/* Insight */}
              <div
                className={`${nodePos} bg-[#fbf9f3] max-lg:ml-2 max-lg:border-l max-lg:border-[#5b3fc4] max-lg:pl-5 lg:left-[40%] lg:top-[87.5%] lg:w-[17rem]`}
              >
                <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-[#8a8573]">
                  <Pencil size={12} aria-hidden="true" /> Insight
                </p>
                <p className="mt-1.5 font-serif text-lg italic leading-snug text-[#3f2b94]">
                  {set.note}
                </p>
              </div>

              {/* Collection */}
              <div
                className={`${nodePos} max-lg:ml-2 lg:left-[80%] lg:top-[91.4%]`}
              >
                <span className="inline-flex items-center gap-2.5 border border-[#5f7a6a] bg-[#e4ebe3] px-3.5 py-2 text-sm text-[#3f5a4b]">
                  <FolderOpen size={15} aria-hidden="true" />
                  <span>
                    <span className="text-[#5f7a6a]">Collection · </span>
                    <span className="font-medium">{set.collection}</span>
                  </span>
                </span>
              </div>
            </>
          ) : (
            <div
              className={`${nodePos} max-w-md border border-dashed border-[#bfb7a0] px-5 py-6 text-center lg:left-1/2 lg:top-[86%] lg:w-[26rem]`}
            >
              <p className="font-serif text-xl text-[#1c1b19]">
                {submitted ? 'Nothing to gather for that question yet' : 'The canvas is empty'}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#5f5b50]">
                This demo only includes samples for a few topics and does not search anything.
                Pick one of the topics above to see how a question gathers sources, an insight, and
                a collection.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Premise: a narrow editorial interlude                               */
/* ------------------------------------------------------------------ */

function Premise() {
  return (
    <section aria-label="Premise" className="px-4 py-24 sm:px-8 sm:py-36">
      <div className="mx-auto grid max-w-[1400px] gap-8 lg:grid-cols-12">
        <Meta className="lg:col-span-3">The premise</Meta>
        <p className="font-serif text-[clamp(1.75rem,3.6vw,3rem)] leading-[1.2] tracking-[-0.01em] text-[#1c1b19] lg:col-span-7 lg:col-start-5">
          A research question is not a one-time search. It is the beginning of{' '}
          <em className="text-[#5b3fc4]">a body of knowledge</em> that grows over time.
        </p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Research in progress: a stepped horizontal timeline                 */
/* ------------------------------------------------------------------ */

function Progress() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-title"
      className="scroll-mt-4 border-t border-[#d9d2bf] px-4 pb-24 pt-20 sm:px-8 sm:pb-32 sm:pt-28"
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Meta>How it works · Research in progress</Meta>
            <Heading
              id="how-title"
              className="mt-4! text-[clamp(2rem,5vw,3.75rem)]! leading-[1.08]!"
            >
              Thinking that carries over between sessions.
            </Heading>
          </div>
          <p className="max-w-md text-[15px] leading-7 text-[#5f5b50] lg:col-span-4 lg:col-start-9 lg:self-end">
            A question changes as you read. Moudel is being built to keep each step of that change
            attached to the last one. The timeline below describes the intended research flow, not a live product walkthrough.
          </p>
        </div>

        <ol className="mt-16 lg:grid lg:grid-cols-4 lg:items-start">
          {progression.map((stage, i) => (
            <li
              key={stage.label}
              style={{ '--i': i }}
              className="relative border-t border-[#1c1b19] pb-10 pt-5 lg:mt-[calc(var(--i)*4.5rem)] lg:border-l lg:pl-6 lg:pr-5 lg:first:border-l-0 lg:first:pl-0"
            >
              <span
                aria-hidden="true"
                className="absolute -top-[5px] left-0 size-[9px] rounded-full bg-[#5b3fc4] lg:left-[-5px] lg:first:left-0"
              />
              <p className="flex items-center justify-between gap-3 text-[11px] font-medium uppercase tracking-[0.16em]">
                <span className="text-[#5b3fc4]">
                  {String(i + 1).padStart(2, '0')} · {stage.label}
                </span>
                <span className="text-[#8a8573]">{stage.session}</span>
              </p>
              <div className="mt-4">{stage.body}</div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Workspace showcase: an editorial canvas                             */
/* ------------------------------------------------------------------ */

function Workspace() {
  const collections = [
    { name: 'Long-context research', active: true },
    { name: 'Climate forecasting' },
    { name: 'Clinical AI review' },
  ]
  return (
    <section
      id="workspace"
      aria-labelledby="workspace-title"
      className="scroll-mt-4 bg-[#ebe5d4] px-4 py-20 sm:px-8 sm:py-28"
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="max-w-2xl">
          <Meta>Workspace</Meta>
          <Heading
            id="workspace-title"
            className="mt-4! text-[clamp(2rem,5vw,3.75rem)]! leading-[1.08]!"
          >
            A question, with its sources and its thinking beside it.
          </Heading>
        </div>

        <div
          role="group"
          aria-label="Illustrative preview of a Moudel research project"
          className="mt-12 border border-[#1c1b19] bg-[#fffdf8] lg:grid lg:grid-cols-[4.5rem_minmax(0,1fr)_14rem]"
        >
          {/* Collection index */}
          <ul className="flex overflow-x-auto border-b border-[#e8e2d1] lg:flex-col lg:overflow-visible lg:border-b-0 lg:border-r">
            {collections.map((c) => (
              <li
                key={c.name}
                className={`shrink-0 whitespace-nowrap px-4 py-3 text-xs lg:flex-1 lg:px-0 lg:py-6 lg:text-center lg:[writing-mode:vertical-rl] lg:rotate-180 ${
                  c.active
                    ? 'bg-[#ece8fa] font-medium text-[#3f2b94]'
                    : 'text-[#8a8573]'
                }`}
              >
                {c.name}
              </li>
            ))}
          </ul>

          {/* Canvas */}
          <div className="min-w-0 p-5 sm:p-10">
            <div className="flex items-center justify-between gap-4">
              <Meta>Research question</Meta>
              <Chip tone="plain">Illustrative preview</Chip>
            </div>
            <p className="mt-4 font-serif text-[clamp(1.75rem,3.4vw,2.9rem)] leading-[1.12] tracking-[-0.01em] text-[#1c1b19]">
              How does retrieval affect long-context reasoning?
            </p>

            <p className="mt-12 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#8a8573]">
              <FileText size={13} aria-hidden="true" /> Sources
            </p>
            <ol className="mt-3 border-t border-[#1c1b19]">
              {workspacePapers.map((paper) => (
                <li
                  key={paper.n}
                  className="grid gap-4 border-b border-[#e8e2d1] py-5 sm:grid-cols-[minmax(0,1fr)_14rem] sm:gap-8"
                >
                  <div className="grid grid-cols-[1.75rem_minmax(0,1fr)]">
                    <span className="pt-0.5">
                      <Cite n={paper.n} />
                    </span>
                    <div className="min-w-0">
                      <p className="font-serif text-lg leading-snug text-[#1c1b19]">{paper.title}</p>
                      <p className="mt-1 text-xs text-[#8a8573]">{paper.meta}</p>
                      <p className="mt-2 text-sm leading-6 text-[#5f5b50]">{paper.summary}</p>
                    </div>
                  </div>
                  {paper.note && (
                    <div className="border-l-2 border-[#5b3fc4] pl-4 sm:-rotate-1">
                      <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-[#8a8573]">
                        <Pencil size={11} aria-hidden="true" /> Note
                      </p>
                      <p className="mt-1.5 font-serif text-base italic leading-snug text-[#3f2b94]">
                        Evidence selection may matter as much as context length.
                      </p>
                      <p className="mt-2 flex items-center gap-1 text-xs text-[#5f5b50]">
                        <Link2 size={12} aria-hidden="true" /> on <Cite n={2} />
                      </p>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>

          {/* Context rail */}
          <aside className="border-t border-[#e8e2d1] p-5 sm:p-8 lg:border-l lg:border-t-0 lg:px-6">
            <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#8a8573]">
              <Tag size={13} aria-hidden="true" /> Tags
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Chip tone="sage">Retrieval</Chip>
              <Chip tone="sage">Evaluation</Chip>
              <Chip tone="sage">Foundations</Chip>
            </div>

            <p className="mt-9 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#8a8573]">
              <History size={13} aria-hidden="true" /> Context
            </p>
            <dl className="mt-3 space-y-2 text-xs text-[#5f5b50]">
              <div className="flex justify-between gap-3 border-b border-[#e8e2d1] pb-2">
                <dt>Sources</dt>
                <dd className="text-[#1c1b19]">3</dd>
              </div>
              <div className="flex justify-between gap-3 border-b border-[#e8e2d1] pb-2">
                <dt>Notes</dt>
                <dd className="text-[#1c1b19]">1</dd>
              </div>
              <div className="pt-1">
                <dt>Next direction</dt>
                <dd className="mt-1 font-serif text-sm text-[#1c1b19]">
                  Compare retrieval-based and long-context approaches.
                </dd>
              </div>
            </dl>
          </aside>
        </div>
        <p className="mt-4 max-w-xl text-xs leading-5 text-[#5f5b50]">
          A static illustration of the intended workspace. Nothing here is saved, and no backend is
          connected yet.
        </p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Features as an annotated index                                      */
/* ------------------------------------------------------------------ */

function Features() {
  return (
    <section aria-labelledby="features-title" className="px-4 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-[1400px]">
        <div className="grid gap-6 lg:grid-cols-12">
          <Meta className="lg:col-span-3">Index</Meta>
          <Heading
            id="features-title"
            className="text-[clamp(2rem,5vw,3.75rem)]! leading-[1.08]! lg:col-span-8"
          >
            Four things a research desk should do well.
          </Heading>
        </div>

        <ol className="mt-14">
          {features.map((feature, i) => (
            <li
              key={feature.n}
              className={`grid gap-6 border-t border-[#d9d2bf] py-10 md:grid-cols-[5rem_minmax(0,1fr)_minmax(0,22rem)] md:gap-10 ${
                i % 2 === 1 ? 'lg:ml-[10%]' : ''
              }`}
            >
              <span className="font-serif text-4xl italic leading-none text-[#5b3fc4]">
                {feature.n}
              </span>
              <div className="max-w-xl">
                <Heading as="h3" className="text-[clamp(1.5rem,2.6vw,2.2rem)]! leading-tight!">
                  {feature.title}
                </Heading>
                <p className="mt-3 text-[15px] leading-7 text-[#5f5b50]">{feature.text}</p>
              </div>
              <div className="md:pt-1">{feature.detail}</div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* ZERA: a restrained look ahead                                       */
/* ------------------------------------------------------------------ */

function Zera() {
  return (
    <section
      id="about"
      aria-labelledby="about-title"
      className="scroll-mt-4 border-t border-[#1c1b19] px-4 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto grid max-w-[1400px] gap-10 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-3">
          <Meta>About · Looking ahead</Meta>
          <p className="mt-4 inline-flex items-center rounded-full border border-[#5b3fc4] bg-[#ece8fa] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[#3f2b94]">
            {'ZERA · Integration in progress'}
          </p>
        </div>

        <div className="lg:col-span-8 lg:col-start-5">
          <Heading
            id="about-title"
            className="text-[clamp(2rem,4.6vw,3.5rem)]! leading-[1.1]!"
          >
            Later, an assistant that starts from <em className="text-[#5b3fc4]!">your</em> sources.
          </Heading>
          <p className="mt-6 max-w-xl text-[15px] leading-7 text-[#5f5b50]">
            {'ZERA is Moudel’s research assistant. The separate ZERA service is connected through a backend chat proxy. The in-app chat experience, citation workflow and research-context integration are being developed.'}
          </p>
          <p className="mt-4 max-w-xl text-[15px] font-medium leading-7 text-[#1c1b19]">
            {'The chat interface shown in the product plan is not represented as a working chat on this landing page. Collection-scoped conversations and persistent research context remain planned integration work.'}
          </p>

          <ul className="mt-12 border-t border-[#1c1b19]">
            {ledger.map((item) => (
              <li
                key={item.name}
                className="flex items-center justify-between gap-4 border-b border-[#e8e2d1] py-4"
              >
                <span className="font-serif text-lg text-[#1c1b19]">{item.name}</span>
                <span
                  className={`shrink-0 text-[11px] font-medium uppercase tracking-[0.14em] ${
                    item.highlight ? 'text-[#5b3fc4]' : 'text-[#8a8573]'
                  }`}
                >
                  {item.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Closing composition                                                 */
/* ------------------------------------------------------------------ */

function Closing() {
  return (
    <section aria-labelledby="closing-title" className="px-4 pb-20 pt-10 sm:px-8 sm:pb-28">
      <div className="mx-auto max-w-[1400px]">
        <ThreadRule />
        <Heading
          id="closing-title"
          tight
          className="mt-14! text-[clamp(2.5rem,9vw,8rem)]! leading-[0.98]!"
        >
          Let your next question{' '}
          <em className="text-[#5b3fc4]!">lead somewhere.</em>
        </Heading>

        <div className="mt-16 grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-8">
          <div className="lg:col-span-4 lg:col-start-2 lg:-rotate-1">
            <Meta>Question Nº 2</Meta>
            <p className="mt-2 font-serif text-2xl italic leading-snug text-[#3f2b94]">
              What would you want to understand next?
            </p>
          </div>
          <div className="lg:col-span-4 lg:col-start-8">
            <Link to="/signup" className={primaryBtn}>
              Start a workspace <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
            <p className="mt-4 text-xs text-[#8a8573]">
              Early development. Workspaces are not open yet.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  const linkCls = `rounded-sm text-xs text-[#5f5b50] hover:text-[#1c1b19] ${ease} ${focusRing}`
  const legalLinks = [
    { label: 'Privacy Policy', to: '/privacy' },
    { label: 'Terms & Conditions', to: '/terms' },
    { label: 'Cookie Policy', to: '/cookies' },
    { label: 'Data Deletion', to: '/data-deletion' },
    { label: 'Research Disclaimer', to: '/research-disclaimer' },
    { label: 'Acceptable Use', to: '/acceptable-use' },
  ]
  return (
    <footer className="border-t border-[#d9d2bf] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <Brand />
            <p className="max-w-xs text-xs leading-5 text-[#8a8573]">
              {'A research workspace for questions, sources, and ideas that grow together.'}
            </p>
          </div>
          <div>
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-[#8a8573]">{'Explore'}</p>
            <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-3">
              {navItems.map((item) => (
                <a key={item.href} href={item.href} className={linkCls}>{item.label}</a>
              ))}
              <Link to="/login" className={linkCls}>{'Log in'}</Link>
              <Link to="/signup" className={linkCls}>{'Get started'}</Link>
            </nav>
          </div>
          <div>
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-[#8a8573]">{'Legal'}</p>
            <nav aria-label="Legal navigation" className="flex flex-col gap-3">
              {legalLinks.map((item) => (
                <Link key={item.to} to={item.to} className={linkCls}>{item.label}</Link>
              ))}
            </nav>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-3 border-t border-[#d9d2bf] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#8a8573]">© {new Date().getFullYear()} Moudel AI. {'All rights reserved.'}</p>
          <p className="text-xs text-[#8a8573]">{'Built for curious minds and persistent research.'}</p>
        </div>
      </div>
    </footer>
  )
}

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

function HomePage() {
  useEffect(() => {
    document.documentElement.lang = 'en'
  }, [])
return (
  <div lang="en" className="min-h-screen overflow-x-clip bg-[#f6f2e8] text-left font-sans tracking-normal text-[#1c1b19] antialiased">
    <SEO
      title="Research Workspace for Papers and Ideas"
      description="Explore academic papers, organize research sources, save notes, and develop ideas in Moudel AI, your intelligent research workspace."
      path="/"
    />

    <Header />

    <main>
      <Hero />
      <Constellation />
      <Premise />
      <Progress />
      <Workspace />
      <Features />
      <Zera />
      <Closing />
    </main>

    <Footer />
  </div>
)
}


export default HomePage
