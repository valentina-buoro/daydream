import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getClient } from "../../lib/portal";

export default function SetPassword() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = params.get("next") === "admin" ? "/admin" : "/account";

  useEffect(() => {
    let active = true;
    const client = getClient();
    const { data: { subscription } } = client.auth.onAuthStateChange(
      (_event, current) => {
        if (active) {
          setSession(current);
          setLoading(false);
        }
      },
    );
    void client.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setError(error.message);
      setSession(data.session);
      setLoading(false);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    const confirmation = String(form.get("confirmation"));
    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { error } = await getClient().auth.updateUser({ password });
      if (error) throw error;
      navigate(next, { replace: true });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to save your password. Request a new setup link.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto my-16 w-full max-w-lg rounded-3xl bg-[linear-gradient(135deg,#ecfeff_0%,#f7fee7_55%,#fff1e6_100%)] p-8 text-left text-[#164e63] shadow-xl shadow-cyan-950/5">
      <h1 className="mb-3 text-3xl font-semibold">Create your password</h1>
      <p className="mb-7 text-sm leading-6 text-[#5f777b]">
        Choose a password for future Daydream sign-ins.
      </p>
      {loading
        ? <p role="status">Opening your secure setup link…</p>
        : session
        ? (
          <form onSubmit={save}>
            <label className="mb-4 block text-sm font-medium">
              New password
              <input
                className="mt-2 block w-full rounded-xl border border-[#0891b2]/20 bg-white/80 p-3 outline-none focus:border-[#0891b2] focus:ring-2 focus:ring-[#0891b2]/10"
                name="password"
                type="password"
                minLength={8}
                autoComplete="new-password"
                required
              />
            </label>
            <label className="mb-5 block text-sm font-medium">
              Confirm password
              <input
                className="mt-2 block w-full rounded-xl border border-[#0891b2]/20 bg-white/80 p-3 outline-none focus:border-[#0891b2] focus:ring-2 focus:ring-[#0891b2]/10"
                name="confirmation"
                type="password"
                minLength={8}
                autoComplete="new-password"
                required
              />
            </label>
            <button
              className="rounded-xl bg-[#0891b2] px-5 py-3 font-semibold text-white transition hover:bg-[#0e7490] disabled:opacity-50"
              disabled={busy}
            >
              {busy ? "Saving…" : "Save password"}
            </button>
          </form>
        )
        : (
          <div className="rounded-xl bg-[#ffedd5] p-4 text-sm leading-6">
            This setup link is invalid or has expired. Request a new link from
            the login page.
          </div>
        )}
      {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      <Link className="mt-7 block text-sm underline underline-offset-4" to="/login">
        Return to login
      </Link>
    </main>
  );
}
