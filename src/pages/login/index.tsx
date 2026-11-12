import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getClient, portal } from "../../lib/portal";

const field =
  "mt-2 block w-full rounded-xl border border-[#0891b2]/20 bg-white/80 p-3 outline-none focus:border-[#0891b2] focus:ring-2 focus:ring-[#0891b2]/10";
const button =
  "rounded-xl bg-[#0891b2] px-5 py-3 font-semibold text-white transition hover:bg-[#0e7490] disabled:opacity-50";

function errorMessage(error: unknown) {
  if (error instanceof Error && /invalid login credentials/i.test(error.message)) {
    return "The email or password is incorrect. If this is your first login, create your password below.";
  }
  return error instanceof Error
    ? error.message
    : "Unable to sign in. Please try again shortly.";
}

export default function Login() {
  const [busy, setBusy] = useState(false);
  const [setupBusy, setSetupBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = params.get("next") === "admin" ? "admin" : "account";

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).trim().toLowerCase();
    const password = String(form.get("password"));
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const { error } = await getClient().auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      navigate(next === "admin" ? "/admin" : "/account", { replace: true });
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function requestPasswordLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (setupBusy) return;
    const email = String(new FormData(event.currentTarget).get("setup-email"))
      .trim().toLowerCase();
    setSetupBusy(true);
    setMessage("");
    setError("");
    try {
      await portal({ action: "password-link", email, next });
      setMessage(
        "If this email is approved, check your inbox for a secure password setup link. Please wait at least a minute before requesting another.",
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to request a password link. Please try again shortly.",
      );
    } finally {
      setSetupBusy(false);
    }
  }

  return (
    <main className="mx-auto my-16 w-full max-w-lg rounded-3xl bg-[linear-gradient(135deg,#ecfeff_0%,#f7fee7_55%,#fff1e6_100%)] p-8 text-left text-[#164e63] shadow-xl shadow-cyan-950/5">
      <h1 className="mb-3 text-3xl font-semibold">Welcome back</h1>
      <p className="mb-7 text-sm leading-6 text-[#5f777b]">
        Sign in with the email address that was approved for your account.
      </p>

      <form onSubmit={signIn}>
        <label className="mb-4 block text-sm font-medium">
          Email address
          <input
            className={field}
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </label>
        <label className="mb-5 block text-sm font-medium">
          Password
          <input
            className={field}
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        <button className={button} disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <section className="mt-8 border-t border-[#0891b2]/15 pt-7">
        <h2 className="text-lg font-semibold">Create or reset your password</h2>
        <p className="my-3 text-sm leading-6 text-[#5f777b]">
          New customers must be approved first. We will send a one-time setup
          link only to an approved email address.
        </p>
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={requestPasswordLink}>
          <label className="sr-only" htmlFor="setup-email">
            Approved email address
          </label>
          <input
            id="setup-email"
            className={`${field} mt-0 flex-1`}
            name="setup-email"
            type="email"
            autoComplete="email"
            placeholder="Approved email address"
            required
          />
          <button className={`${button} shrink-0`} disabled={setupBusy}>
            {setupBusy ? "Sending…" : "Send setup link"}
          </button>
        </form>
      </section>

      {message && <p role="status" className="mt-5 rounded-xl bg-[#ecfccb] p-4 text-sm">{message}</p>}
      {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      <Link className="mt-7 block text-sm underline underline-offset-4" to="/">
        Back to Daydream
      </Link>
    </main>
  );
}
