import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Heart, Search } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type FAQItem = { question: string; answer: string };
type FAQCategory = { id: string; title: string; items: FAQItem[] };

const faqCategories: FAQCategory[] = [
  {
    id: "about-mingleza",
    title: "About Mingleza",
    items: [
      {
        question: "What is Mingleza?",
        answer:
          "Mingleza is a Kenya-first, adults-only social app for meeting people for friendship or opt-in dating. Members choose an intent and can discover profiles that have enabled the same intent.",
      },
      {
        question: "Who is Mingleza for?",
        answer:
          "Mingleza is for adults aged 18 and over. Adult verification is required before a member can complete profile setup and use member discovery.",
      },
      {
        question: "Is Mingleza only for dating?",
        answer:
          "No. Friendship is an available way to connect. Dating is also available as a profile intent, but dating likes and matches are not implemented yet.",
      },
      {
        question: "Where is Mingleza available?",
        answer:
          "The product is built with Kenya in mind. The countries available for profile details depend on the active supported-country configuration; availability outside Kenya has not been confirmed here.",
      },
      {
        question: "How is Mingleza different from other apps?",
        answer:
          "Mingleza supports both friendship and opt-in dating in one adults-only app and uses email-and-password sign-in. We do not make verified comparative claims about other services.",
      },
    ],
  },
  {
    id: "getting-started",
    title: "Getting started",
    items: [
      {
        question: "How do I get started?",
        answer:
          "Choose Sign up, create an account with your email and password, complete the 18+ verification, then add a display name and town or city and choose your intent.",
      },
      {
        question: "Do I need an account to browse members?",
        answer:
          "Yes. Discover is available to signed-in members who have completed adult verification. Logged-out visitors can read public product information and the draft Terms and Privacy pages.",
      },
      {
        question: "What information do I need to create an account?",
        answer:
          "You need your full name, email address, password, phone number, country, and age bracket. You must also provide your date of birth for the separate 18+ eligibility check and complete a display name and town or city. A profile photo is optional.",
      },
      {
        question: "What should I do after signing in?",
        answer:
          "Complete the profile steps first. Choose a display name and city, optionally add a profile photo, then select whether you want to be discoverable for friendship, dating, or both.",
      },
      {
        question: "Can I browse before finishing profile setup?",
        answer:
          "No. New or incomplete profiles are kept out of Discover until the required profile setup is complete. You can return to setup after signing in.",
      },
    ],
  },
  {
    id: "sign-in-and-age",
    title: "Sign-in and adult verification",
    items: [
      {
        question: "Do I need a password?",
        answer:
          "Mingleza uses email and password. You can request a password-reset email if you forget your password.",
      },
      {
        question: "How do I sign in with my phone?",
        answer:
          "Enter the email address and password you registered with. Phone number is collected as account information, not as a sign-in method.",
      },
      {
        question: "How do I sign in with email?",
        answer:
          "Enter the email address and password you registered with. If you cannot remember the password, use Forgot password to request a reset email.",
      },
      {
        question: "What if I forget my password?",
        answer:
          "Choose Forgot password on the sign-in screen and request a reset email. If the address belongs to an account, a reset message will be sent.",
      },
      {
        question: "How does the 18+ check work?",
        answer:
          "You enter your date of birth for an age-eligibility calculation. The current app uses self-attestation; it does not verify a government ID or use biometrics. People under 18 cannot proceed.",
      },
      {
        question: "Does Mingleza save or display my date of birth?",
        answer:
          "The date of birth is used for the check and is not stored as a date or shown on your profile. The app records an adult-verification result and its check time. Mingleza does not display members’ ages.",
      },
      {
        question: "What if my sign-in code or link does not work?",
        answer:
          "Check that you entered the correct phone number or email address. Codes and links can expire or be used once; request a new one after the resend timer. If the problem continues, the app currently has no published support contact, so help from the Mingleza team is not yet available through a listed channel.",
      },
    ],
  },
  {
    id: "profiles-and-discovery",
    title: "Profiles and Discover",
    items: [
      {
        question: "What goes on my profile?",
        answer:
          "A profile can include your display name, bio, profile photo, town or city, region, country, and the connection intents you enable. The member-facing app does not display age.",
      },
      {
        question: "Is a profile photo required?",
        answer:
          "No. A photo is optional; the app can show an initials-based avatar instead. The current upload accepts JPG, PNG, or WebP images up to 5 MB.",
      },
      {
        question: "Are my profile photos private?",
        answer:
          "Not completely. The current profile-avatar storage bucket allows public reads, so an image may be accessible through its direct URL even when someone is not browsing your profile in Discover. There is no photo-visibility toggle yet. Upload only a photo you are comfortable sharing publicly, and do not upload a sensitive image. The owner still needs to decide whether to move to private, signed access.",
      },
      {
        question: "Who can see my profile?",
        answer:
          "Profile pages are not public web pages. A completed, discoverable profile can be shown to signed-in, age-verified members when its enabled intent matches. Existing connections can also see profile details, subject to the app’s access rules. Profile photos are different: the current storage bucket allows public reads, as explained above.",
      },
      {
        question: "How does Discover choose which profiles to show?",
        answer:
          "Choose Friends or Dating. Discover returns eligible adult-verified profiles that are discoverable and have enabled that same intent. Profiles already connected to you or excluded by a block are filtered out.",
      },
      {
        question: "Can I change my profile after setup?",
        answer:
          "The Profile section lets you update profile details such as display name, bio, photo, and location fields. The current app does not provide a full set of ongoing visibility and intent-management controls; those controls need further product work.",
      },
      {
        question: "Can I hide my profile whenever I want?",
        answer:
          "New profiles stay hidden until setup is complete, but a member-facing control for turning discoverability off later is not currently available. Do not assume that removing the app or signing out hides an already discoverable profile.",
      },
      {
        question: "Does Mingleza show exact location or distance?",
        answer:
          "No. The current app uses profile location fields such as town or city; it does not provide a map or distance filter. Map and distance-based discovery are marked as coming soon.",
      },
    ],
  },
  {
    id: "friendship-and-messages",
    title: "Friend requests and messages",
    items: [
      {
        question: "How do I connect with someone for friendship?",
        answer:
          "In Discover, choose Friends and send a friend request to a profile that is open to friendship. The other member must accept before you can start a private conversation.",
      },
      {
        question: "Can I cancel or respond to a friend request?",
        answer:
          "The app supports accepting or declining incoming requests and cancelling a request you sent while it is pending. You can find requests in the member connection area.",
      },
      {
        question: "Who can message me?",
        answer:
          "Direct conversations are limited to accepted friends. The app does not provide open messaging between people who have not accepted a friend request.",
      },
      {
        question: "Are messages real time?",
        answer:
          "The current app supports stored one-to-one messages between accepted friends. Real-time delivery and message notifications are not implemented, so a new message may not appear until the conversation is loaded again.",
      },
      {
        question: "Can I edit or delete a message?",
        answer:
          "The current member-facing messaging screen supports sending and reading messages, but does not expose message-edit or delete controls.",
      },
    ],
  },
  {
    id: "dating-and-current-limits",
    title: "Dating and current limitations",
    items: [
      {
        question: "How does the Dating intent work today?",
        answer:
          "Members can opt in to Dating and browse profiles that have enabled it. Dating likes, mutual matches, and a dating-specific conversation flow are not available yet.",
      },
      {
        question: "Is Mingleza free?",
        answer:
          "The current application has no paid plans, checkout, or payment flow. Pricing or future payment terms have not been announced.",
      },
      {
        question: "Can I use a map or filter by distance?",
        answer:
          "Not currently. Explore is a coming-soon page; the app does not calculate or show precise distance or provide a member map.",
      },
      {
        question: "Does Mingleza send message or friend-request notifications?",
        answer:
          "Push, email, and real-time notifications are not implemented in the current application. Check the relevant app pages for updated requests and messages.",
      },
    ],
  },
  {
    id: "privacy-safety-and-help",
    title: "Privacy, safety, and help",
    items: [
      {
        question: "Does Mingleza show my phone number to other members?",
        answer:
          "The profile data returned to Discover does not include your phone number. Your phone number is used for SMS sign-in, not displayed as a profile field.",
      },
      {
        question: "Can I block or report a member in the app?",
        answer:
          "Member-facing report and block controls are not available yet. Although the database includes some related foundations, there is no completed in-app workflow or published moderation-support contact. This is an important unfinished safety feature.",
      },
      {
        question: "Can I delete my account or request data deletion?",
        answer:
          "A self-service account deletion flow and a published data-deletion request channel are not available in the current app. The owner needs to provide an approved process and support contact before this can be answered as an available service.",
      },
      {
        question: "Where can I read the Privacy Policy and Terms?",
        answer:
          "The public site has /privacy and /terms pages, but they are explicitly draft placeholders pending legal review. They are not final policies or legal advice.",
      },
      {
        question: "What security and privacy details are confirmed?",
        answer:
          "The code uses authenticated server-side requests and database access policies for member features, and it avoids storing date of birth. This technical summary is not a security certification or a substitute for the final Privacy Policy; independent production security and provider configuration have not been verified here.",
      },
      {
        question: "How do I contact Mingleza support or report a bug?",
        answer:
          "A public support email, contact form, operating hours, and bug-report channel have not been provided in the repository. The owner needs to publish a verified contact route before support requests can be directed reliably.",
      },
      {
        question: "What should I do if something does not load or save?",
        answer:
          "Check your connection and retry the action. For a sign-in code or email link, confirm your contact details and request a fresh credential after the resend timer. The app displays an error when several operations fail, but no public support route is available if retrying does not resolve the problem.",
      },
    ],
  },
];

function normalize(value: string) {
  return value
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function PublicFAQPage() {
  const [query, setQuery] = useState("");
  const totalFaqCount = faqCategories.reduce((count, category) => count + category.items.length, 0);
  const visibleCategories = useMemo(() => {
    const search = normalize(query.trim());
    return faqCategories
      .map((category) => ({
        ...category,
        items: category.items.filter((item) =>
          search
            ? normalize(`${category.title} ${item.question} ${item.answer}`).includes(search)
            : true,
        ),
      }))
      .filter((category) => category.items.length > 0);
  }, [query]);
  const resultCount = visibleCategories.reduce(
    (count, category) => count + category.items.length,
    0,
  );

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-full font-display text-lg font-extrabold"
          >
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground"
            >
              <Heart className="size-4 fill-current" />
            </span>
            Mingleza
          </a>
          <a
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to Mingleza
          </a>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <a
          href="#faq-categories"
          className="sr-only rounded bg-card px-3 py-2 focus:not-sr-only focus-visible:outline-2 focus-visible:outline-ring"
        >
          Skip to frequently asked questions
        </a>
        <div className="max-w-3xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">
            Help and product information
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Frequently asked questions
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Answers about how Mingleza works today, including features that are not available yet.
            For legal details, see the current draft{" "}
            <a className="underline" href="/privacy">
              Privacy
            </a>{" "}
            and{" "}
            <a className="underline" href="/terms">
              Terms
            </a>{" "}
            pages.
          </p>
        </div>

        <div className="mt-8 max-w-2xl">
          <label htmlFor="faq-search" className="mb-2 block text-sm font-bold">
            Search questions
          </label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
            />
            <input
              id="faq-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try “sign in”, “messages”, or “privacy”"
              className="min-h-12 w-full rounded-2xl border border-input bg-card py-3 pl-12 pr-4 text-base shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-describedby="faq-result-count"
            />
          </div>
          <p
            id="faq-result-count"
            className="mt-2 text-sm text-muted-foreground"
            aria-live="polite"
          >
            {query.trim()
              ? `${resultCount} ${resultCount === 1 ? "answer" : "answers"} match your search.`
              : `${totalFaqCount} answers across ${faqCategories.length} topics.`}
          </p>
        </div>

        <div id="faq-categories" className="mt-8 space-y-8">
          {visibleCategories.length === 0 ? (
            <div className="rounded-3xl border border-border bg-card p-7" role="status">
              <h2 className="text-xl font-bold">No matching questions</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Try another search term. The Mingleza team has not published a direct support
                contact yet.
              </p>
            </div>
          ) : (
            visibleCategories.map((category) => (
              <section key={category.id} aria-labelledby={`${category.id}-title`}>
                <h2 id={`${category.id}-title`} className="mb-3 font-display text-2xl font-bold">
                  {category.title}
                </h2>
                <Accordion
                  type="multiple"
                  className="rounded-3xl border border-border bg-card px-4 shadow-soft sm:px-6"
                >
                  {category.items.map((item, index) => (
                    <AccordionItem key={item.question} value={`${category.id}-${index}`}>
                      <AccordionTrigger className="min-h-14 py-4 text-left text-base font-bold text-foreground hover:no-underline">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="pb-5 text-sm leading-6 text-muted-foreground">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            ))
          )}
        </div>

        <section className="mt-12 rounded-3xl bg-primary px-6 py-8 text-primary-foreground sm:px-9">
          <h2 className="font-display text-2xl font-extrabold">Ready to meet your people?</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6">
            Create a profile, choose friendship or dating, and explore Mingleza. Adults 18+ only.
          </p>
          <a
            href="/login"
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-card px-5 py-3 text-sm font-bold text-primary hover:bg-secondary"
          >
            Get started <ArrowRight aria-hidden="true" className="size-4" />
          </a>
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap gap-x-6 gap-y-2 px-4 py-5 text-sm text-muted-foreground sm:px-6">
          <a className="inline-flex min-h-11 items-center underline" href="/terms">
            Terms
          </a>
          <a className="inline-flex min-h-11 items-center underline" href="/privacy">
            Privacy
          </a>
          <a className="inline-flex min-h-11 items-center underline" href="/">
            Mingleza home
          </a>
        </div>
      </footer>
    </div>
  );
}
