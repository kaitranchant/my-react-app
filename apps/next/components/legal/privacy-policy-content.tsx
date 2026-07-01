import { APP_NAME, getLegalContactEmail } from '@/lib/brand'

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="text-muted-foreground space-y-3 text-sm leading-relaxed">
        {children}
      </div>
    </section>
  )
}

export function PrivacyPolicyContent() {
  const contactEmail = getLegalContactEmail()
  const effectiveDate = 'July 1, 2026'

  return (
    <article className="space-y-8">
      <header className="space-y-2">
        <h1 className="page-title">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm">
          Effective date: {effectiveDate}
        </p>
        <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed">
          {APP_NAME} (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) provides
          software for fitness and wellness coaches to manage clients, programs,
          and scheduling. This policy describes how we collect, use, and protect
          personal information when you use our website and applications.
        </p>
      </header>

      <Section title="Information we collect">
        <p>
          <strong className="text-foreground">Account information.</strong> When you
          create an account, we collect your name, email address, password (stored
          securely by our authentication provider), and profile details you choose
          to provide.
        </p>
        <p>
          <strong className="text-foreground">Coaching and client data.</strong>{' '}
          Coaches and clients may store workout programs, exercise logs, nutrition
          records, goals, check-ins, progress photos, body-composition scans,
          messages, appointments, and related coaching notes within the platform.
        </p>
        <p>
          <strong className="text-foreground">Usage data.</strong> We collect
          standard technical information such as browser type, device information,
          and interaction logs needed to operate, secure, and improve the service.
        </p>
      </Section>

      <Section title="Google Calendar (optional)">
        <p>
          Coaches may optionally connect a Google account to sync scheduling. If
          you connect Google Calendar, we access your Google account email to
          identify the connection and use Google Calendar permissions you approve
          during sign-in.
        </p>
        <p>
          With your permission, we use calendar access to: (1) create, update, and
          delete calendar events for coaching appointments booked in {APP_NAME};
          (2) sync changes made to linked events back into appointment records; and
          (3) read busy/free time blocks so clients cannot book slots that conflict
          with existing calendar events.
        </p>
        <p>
          We only modify Google Calendar events that are linked to appointments
          created through {APP_NAME}. We do not read or change unrelated personal
          calendar events. OAuth tokens are stored securely on our servers and are
          used only to provide these features. You can disconnect Google Calendar
          at any time from Scheduling settings.
        </p>
      </Section>

      <Section title="Payments">
        <p>
          Subscription and client billing are processed by Stripe. Payment card
          details are handled directly by Stripe; we do not store full card numbers
          on our servers. Stripe&apos;s privacy policy applies to payment
          processing.
        </p>
      </Section>

      <Section title="Integrations and third-party services">
        <p>
          We use trusted service providers to operate {APP_NAME}, including hosting
          and database services (Supabase, Vercel), email delivery (Resend), payment
          processing (Stripe), and optional integrations you choose to enable such
          as wearable devices (for example, Whoop or Apple Health) and scan
          processing for body-composition photos.
        </p>
        <p>
          These providers process data on our behalf under their own terms and
          privacy policies. We share only the information needed to provide the
          relevant feature.
        </p>
      </Section>

      <Section title="How we use information">
        <p>We use personal information to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Provide, maintain, and improve the platform</li>
          <li>Authenticate users and secure accounts</li>
          <li>Facilitate coaching workflows between coaches and clients</li>
          <li>Send service-related notifications you request or enable</li>
          <li>Process payments and subscriptions</li>
          <li>Comply with legal obligations and prevent abuse</li>
        </ul>
      </Section>

      <Section title="Data retention">
        <p>
          We retain account and coaching data for as long as your account is active
          or as needed to provide the service. You may request account deletion
          from account settings; we will delete or anonymize personal data within a
          reasonable period, except where retention is required by law or for
          legitimate business purposes such as resolving disputes.
        </p>
      </Section>

      <Section title="Your choices and rights">
        <p>
          You can update profile information in settings, manage notification
          preferences, disconnect third-party integrations, and delete your account.
          Depending on where you live, you may have rights to access, correct,
          delete, or export your personal data. Contact us to exercise these
          rights.
        </p>
      </Section>

      <Section title="Security">
        <p>
          We use industry-standard safeguards including encrypted connections,
          access controls, and secure authentication. No method of transmission or
          storage is completely secure; we cannot guarantee absolute security.
        </p>
      </Section>

      <Section title="Children">
        <p>
          {APP_NAME} is not intended for children under 16. We do not knowingly
          collect personal information from children.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          We may update this policy from time to time. We will post the revised
          policy on this page and update the effective date above. Continued use of
          the service after changes means you accept the updated policy.
        </p>
      </Section>

      <Section title="Contact us">
        <p>
          Questions about this privacy policy or our data practices? Email us at{' '}
          <a
            href={`mailto:${contactEmail}`}
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            {contactEmail}
          </a>
          .
        </p>
      </Section>
    </article>
  )
}
