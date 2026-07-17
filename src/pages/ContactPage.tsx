import { useState } from 'react';
import { Send } from 'lucide-react';

const FEEDBACK_EMAIL = 'arpanbosmia90@gmail.com';
const FEEDBACK_SUBJECT = 'corruption watch feedback';

export default function ContactPage() {
  const [body, setBody] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    const mailto = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(
      FEEDBACK_SUBJECT
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setSent(true);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-zinc-950 text-white selection:bg-[#4A90E2]/30">
      <main
        className="px-4 md:px-8"
        id="main-content"
        aria-label="Contact and feedback"
      >
        <div className="animate-in fade-in mx-auto max-w-4xl duration-500">
          <div className="flex h-40 items-center justify-center text-center">
            <h1 className="text-5xl font-black tracking-tighter text-white uppercase md:text-6xl">
              Con<span className="text-[#4A90E2]">tact</span>
            </h1>
          </div>

          <div className="mx-auto mt-6 max-w-2xl space-y-5">
            <label
              htmlFor="feedback-body"
              className="block text-sm font-black tracking-[0.2em] text-zinc-400 uppercase"
            >
              Your Feedback
            </label>
            <textarea
              id="feedback-body"
              rows={10}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
              }}
              placeholder="Please provide feedback here on this site. This could include suggestions, observations of any data discrepancies, etc. Please be as specific as possible in your feedback (reference exact bills, vote numbers, PACS, amounts, etc.)"
              className="bg-card w-full rounded-2xl border border-white/10 p-5 text-base text-white placeholder-white/50 focus:ring-2 focus:ring-[#4A90E2] focus:outline-none"
            />

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleSend}
                disabled={body.trim().length === 0}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#2f6db3] px-8 py-3 text-lg font-black tracking-tighter text-white uppercase transition hover:bg-[#275c96] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="h-5 w-5" aria-hidden="true" />
                Send
              </button>
              {sent && (
                <p
                  role="status"
                  className="text-base font-semibold text-emerald-400"
                >
                  Thank you for providing feedback.
                </p>
              )}
            </div>

            <p className="text-xs leading-relaxed text-zinc-400">
              Pressing Send opens your email app with your feedback addressed to
              the Corruption Watch team — sending the email from there delivers
              it. Your message is not transmitted anywhere else.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
