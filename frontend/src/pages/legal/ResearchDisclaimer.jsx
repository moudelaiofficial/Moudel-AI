
import LegalLayout from '../../components/legal/LegalLayout.jsx'

export default function ResearchDisclaimer() {
  return (
    <LegalLayout
      title="Research Disclaimer"
      description="Important information about research metadata, academic sources, automated outputs and independent verification."
    >
      <section>
        <h2>1. Research Information</h2>
        <p>
          Moudel AI provides research discovery and organisation tools.
          Information displayed on the platform may originate from
          external academic databases and research providers.
        </p>
      </section>

      <section>
        <h2>2. Accuracy and Completeness</h2>
        <p>
          We do not guarantee that research metadata, publication
          information, abstracts, links or other displayed information
          is accurate, complete or up to date.
        </p>
        <p>
          Users should verify important information against the
          original publication or authoritative source.
        </p>
      </section>

      <section>
        <h2>3. Copyright and Licensing</h2>
        <p>
          Research metadata being accessible through Moudel AI does
          not mean that the associated full-text publication is
          available for unrestricted use.
        </p>
        <p>
          Copyright, licensing and reuse restrictions may apply.
          Users must respect the rights of authors, publishers and
          other rights holders.
        </p>
      </section>

      <section>
        <h2>4. External Research Providers</h2>
        <p>
          Moudel AI may retrieve research information from services
          such as OpenAlex. External providers operate independently
          and may change their data, availability, policies or terms.
        </p>
      </section>

      <section>
        <h2>5. Automated and AI-Assisted Outputs</h2>
        <p>
          Where automated or AI-assisted research features are made
          available, their outputs may contain errors, omissions or
          misleading interpretations.
        </p>
        <p>
          Such outputs should be treated as assistance rather than
          authoritative academic conclusions. Always consult the
          original sources and apply independent judgement.
        </p>
      </section>

      <section>
        <h2>6. No Professional Advice</h2>
        <p>
          Information provided through Moudel AI is for research
          and informational purposes. It is not a substitute for
          professional, legal, medical or other specialist advice.
        </p>
      </section>

      <section>
        <h2>7. Contact</h2>
        <p>Contact: [INSERT OFFICIAL COMPANY EMAIL]</p>
      </section>
    </LegalLayout>
  )
}
