
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Sparkles } from 'lucide-react'

export default function ZeraMessage({ message }) {
  const isAssistant = message.role === 'assistant'

  return (
    <article className={isAssistant ? '' : 'flex justify-end'}>
      {isAssistant ? (
        <div className="overflow-hidden rounded-sm border border-[#ded7c9] bg-[#fffdf8]">

          {/* Assistant identity */}
          <div className="flex items-center justify-between border-b border-[#e8e1d5] px-5 py-3 sm:px-7">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eae4f7] font-serif text-sm italic text-[#60489f]">
                Z
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#766d60]">
                  ZERA
                </p>
                <p className="mt-0.5 text-[9px] tracking-wide text-[#a09787]">
                  Research intelligence
                </p>
              </div>
            </div>

            <Sparkles size={15} className="text-[#9279c7]" />
          </div>

          {/* Research response */}
          <div className="px-5 py-7 sm:px-8 sm:py-9 lg:px-10">

            <div
              className="
                prose prose-base max-w-none
                text-[14px] sm:text-[15px]
                leading-[1.9] text-[#49443b]

                prose-headings:font-serif
                prose-headings:font-normal
                prose-headings:tracking-tight
                prose-headings:text-[#292720]

                prose-h1:mb-6
                prose-h1:mt-0
                prose-h1:text-3xl
                prose-h1:leading-tight

                prose-h2:mb-5
                prose-h2:mt-11
                prose-h2:border-b
                prose-h2:border-[#e8e1d5]
                prose-h2:pb-3
                prose-h2:text-2xl
                prose-h2:leading-snug

                prose-h3:mb-3
                prose-h3:mt-8
                prose-h3:text-xl
                prose-h3:leading-snug

                prose-p:my-4
                prose-p:leading-[1.9]

                prose-strong:font-semibold
                prose-strong:text-[#292720]

                prose-ul:my-5
                prose-ol:my-5
                prose-ul:pl-6
                prose-ol:pl-6

                prose-li:my-2
                prose-li:pl-1
                prose-li:leading-8
                prose-li:marker:text-[#9279c7]

                prose-a:font-medium
                prose-a:text-[#7058b2]
                prose-a:underline-offset-4
                hover:prose-a:text-[#49338c]

                prose-blockquote:my-7
                prose-blockquote:border-l-[3px]
                prose-blockquote:border-[#b9a8df]
                prose-blockquote:bg-[#f5f1f8]
                prose-blockquote:px-5
                prose-blockquote:py-2
                prose-blockquote:not-italic
                prose-blockquote:text-[#756c60]

                prose-hr:my-9
                prose-hr:border-[#e8e1d5]

                prose-table:text-sm
                prose-th:bg-[#f3efe6]
                prose-th:px-3
                prose-th:py-3
                prose-th:text-left
                prose-th:font-semibold
                prose-th:text-[#49443b]
                prose-td:border-[#e8e1d5]
                prose-td:px-3
                prose-td:py-3

                prose-code:rounded
                prose-code:bg-[#f0ece4]
                prose-code:px-1.5
                prose-code:py-0.5
                prose-code:text-[#60489f]
                prose-code:before:content-none
                prose-code:after:content-none

                prose-pre:rounded-sm
                prose-pre:border
                prose-pre:border-[#e8e1d5]
                prose-pre:bg-[#f4f0e8]
                prose-pre:text-[#39352e]
              "
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          </div>

          {/* Editorial footer */}
          <div className="flex items-center justify-between border-t border-[#e8e1d5] bg-[#faf7f0] px-5 py-3 sm:px-7">
            <span className="text-[9px] uppercase tracking-[0.15em] text-[#9a907f]">
              Moudel / ZERA
            </span>

            <span className="text-[9px] text-[#9a907f]">
              Evidence-grounded research
            </span>
          </div>
        </div>
      ) : (
        /* User message */
        <div className="flex max-w-[85%] items-start gap-3">
          <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eae4f7] font-serif text-sm text-[#60489f]">
            M
          </div>

          <div className="border border-[#ded7c9] bg-[#f0ece2] px-5 py-4">
            <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#8b8172]">
              You asked
            </p>

            <div className="whitespace-pre-wrap text-sm leading-7 text-[#39352e]">
              {message.content}
            </div>
          </div>
        </div>
      )}
    </article>
  )
}
