
import {
  ArrowUpRight,
  FileText,
  Quote,
  CalendarDays,
} from 'lucide-react'

export default function PaperCard({ paper, index }) {
  return (
    <article className="group border-t border-[#ded7c9] py-5 first:border-t-0">
      <div className="flex gap-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d9d0eb] bg-[#eee9f8] font-serif text-sm text-[#644da6]">
          {String(index).padStart(2, '0')}
        </span>

        <div className="min-w-0 flex-1">
          <h4 className="font-serif text-[17px] leading-7 text-[#292720] transition-colors group-hover:text-[#644da6]">
            {paper.title || 'Untitled research paper'}
          </h4>

          <p className="mt-2 text-xs leading-6 text-[#827b6e]">
            {paper.authors?.slice(0, 3).join(', ') || 'Authors unavailable'}
            {paper.authors?.length > 3 && ' et al.'}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-[#918979]">
            <span className="flex items-center gap-1.5">
              <CalendarDays size={12} />
              {paper.publication_date || 'Date unavailable'}
            </span>

            <span className="flex items-center gap-1.5">
              <Quote size={12} />
              {paper.citation_count ?? 0} citations
            </span>
          </div>

          {(paper.paper_url || paper.pdf_url) && (
            <div className="mt-4 flex flex-wrap gap-4">
              {paper.paper_url && (
                <a
                  href={paper.paper_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7058b2] transition hover:text-[#49338c]"
                >
                  View paper
                  <ArrowUpRight size={13} />
                </a>
              )}

              {paper.pdf_url && (
                <a
                  href={paper.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7058b2] transition hover:text-[#49338c]"
                >
                  <FileText size={13} />
                  Read PDF
                  <ArrowUpRight size={13} />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
