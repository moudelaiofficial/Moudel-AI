
import LegalLayout from '../../components/legal/LegalLayout.jsx'

export default function CookiePolicy() {
  return (
    <LegalLayout
      title="Cookie Policy"
      description="Information about cookies, browser storage and similar technologies used by Moudel AI."
    >
      <section>
        <h2>1. Introduction</h2>
        <p>
          This Cookie Policy explains how Moudel AI may use cookies,
          local storage, session storage and similar browser technologies
          when you access the platform.
        </p>
      </section>

      <section>
        <h2>2. What Are Cookies?</h2>
        <p>
          Cookies are small data files stored by your browser. Similar
          technologies can store information locally to support
          authentication, preferences and website functionality.
        </p>
      </section>

      <section>
        <h2>3. How We May Use These Technologies</h2>
        <ul>
          <li>Maintaining authenticated sessions.</li>
          <li>Supporting account security.</li>
          <li>Remembering essential application preferences.</li>
          <li>Supporting the operation of the platform.</li>
        </ul>
        <p>
          The exact technologies used depend on the authentication
          configuration and deployed application.
        </p>
      </section>

      <section>
        <h2>4. Analytics and Tracking</h2>
        <p>
          The use of analytics, advertising or behavioural tracking
          technologies has not yet been confirmed for this policy.
          Any such technologies must be identified and disclosed
          accurately before this page is published.
        </p>
      </section>

      <section>
        <h2>5. Managing Browser Storage</h2>
        <p>
          You can manage or clear cookies and browser storage through
          your browser settings. Blocking essential storage may affect
          login, session management or other platform functionality.
        </p>
      </section>

      <section>
        <h2>6. Third-Party Services</h2>
        <p>
          Moudel AI uses external infrastructure and service providers.
          Their own technologies and privacy practices may also apply
          when their services are used.
        </p>
      </section>

      <section>
        <h2>7. Updates</h2>
        <p>
          This policy may be updated when our use of browser storage
          or tracking technologies changes.
        </p>
      </section>

      <section>
        <h2>8. Contact</h2>
        <p>Contact:<a href="mailto:moudelai@gmail.com">moudelai@gmail.com</a></p>
      </section>
    </LegalLayout>
  )
}
