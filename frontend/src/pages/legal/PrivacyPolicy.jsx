
import LegalLayout from '../../components/legal/LegalLayout.jsx'

export default function PrivacyPolicy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      description="How Moudel AI collects, uses, stores and protects information when you use our research platform."
    >
      <section>
        <h2>1. Introduction</h2>
        <p>
          Moudel AI is a research discovery and workspace platform designed
          to help users discover academic research, organise papers and
          maintain continuity across their research activities.
        </p>
        <p>
          This Privacy Policy explains how personal information is handled
          when you access or use Moudel AI. The service is currently operated
          under the Moudel AI name by [INSERT FULL LEGAL NAME OF OPERATOR].
        </p>
      </section>

      <section>
        <h2>2. Information We Collect</h2>
        <ul>
          <li>Account information, including email address and authentication identifiers.</li>
          <li>Profile information and user preferences.</li>
          <li>Saved research papers and collections.</li>
          <li>Research activity and workspace interactions.</li>
          <li>Search queries and technical information where recorded.</li>
          <li>Information you voluntarily provide when contacting us.</li>
        </ul>
        <p>
          If additional features such as document uploads or research notes
          are introduced, their data handling practices will be disclosed
          before or when those features are used.
        </p>
      </section>

      <section>
        <h2>3. How We Use Information</h2>
        <ul>
          <li>To create and maintain user accounts.</li>
          <li>To provide research discovery and workspace functionality.</li>
          <li>To save and organise papers and collections.</li>
          <li>To maintain platform security and prevent misuse.</li>
          <li>To respond to support and privacy requests.</li>
          <li>To comply with applicable legal obligations.</li>
        </ul>
      </section>

      <section>
        <h2>4. Infrastructure and Third-Party Services</h2>
        <p>
          Moudel AI currently uses the following infrastructure and
          external services:
        </p>
        <ul>
          <li><strong>Supabase:</strong> Authentication and database services.</li>
          <li><strong>Render:</strong> Backend application hosting.</li>
          <li><strong>Vercel:</strong> Frontend application hosting.</li>
          <li><strong>OpenAlex:</strong> Academic research metadata and discovery.</li>
        </ul>
        <p>
          These providers may process information as necessary to provide
          their services. Their applicable privacy policies and processing
          locations should also be reviewed.
        </p>
      </section>

      <section>
        <h2>5. Cookies and Local Storage</h2>
        <p>
          The platform may use browser storage and similar technologies
          for authentication, session management, security and essential
          functionality. Any analytics or advertising technologies, if
          introduced, will be disclosed separately.
        </p>
        <p>See our Cookie Policy for further information.</p>
      </section>

      <section>
        <h2>6. Data Sharing</h2>
        <p>
          We do not intend to sell personal information. Information may
          be processed by infrastructure providers, disclosed where
          legally required, or shared when necessary to protect the
          platform and its users.
        </p>
      </section>

      <section>
        <h2>7. Data Retention</h2>
        <p>
          We retain information for as long as necessary to provide the
          service, maintain user accounts, meet legal obligations and
          resolve disputes. Actual retention periods depend on the
          information type and applicable operational requirements.
        </p>
      </section>

      <section>
        <h2>8. Data Security</h2>
        <p>
          We use appropriate technical and organisational safeguards
          intended to protect information against unauthorised access,
          loss, misuse or disclosure. No internet-based system can
          guarantee absolute security.
        </p>
      </section>

      <section>
        <h2>9. Your Privacy Rights</h2>
        <p>
          Subject to applicable law, you may request access to, correction
          of, or deletion of your personal information, withdraw consent
          where processing relies on consent, or raise a privacy grievance.
        </p>
        <p>
          Contact us using the legal contact details below to submit a request.
        </p>
      </section>

      <section>
        <h2>10. Children</h2>
        <p>
          The intended minimum age for using Moudel AI must be confirmed
          before publication. Do not create an account if you are below
          the age specified in our eligibility requirements.
        </p>
      </section>

      <section>
        <h2>11. Changes to This Policy</h2>
        <p>
          We may update this policy when our platform, processing practices
          or legal obligations change. The revised version will be published
          on this page with an updated date.
        </p>
      </section>

      <section>
        <h2>12. Contact</h2>
        <p>
          Privacy and legal enquiries:
          <strong> [INSERT OFFICIAL COMPANY EMAIL]</strong>
        </p>
        <p>
          Legal operator: [INSERT FULL LEGAL NAME OF FOUNDER OR OPERATING ENTITY]
        </p>
      </section>
    </LegalLayout>
  )
}
