
/* eslint-disable @typescript-eslint/no-explicit-any */

export default function Login({ busy, onSubmit }: any) {
  return (
    <main className="login-layout">
      <div>
        <div className="eyebrow">WELCOME BACK</div>
        <h1>
          Your inbox
          <br />
          holds <em>the key.</em>
        </h1>
        <p>
          Sign in with a secure email link.
          <br />
          One less password to remember.
        </p>
      </div>
      <section className="form-card">
        <h2>Customer sign in</h2>
        <p>Use the email associated with your approved account.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(new FormData(e.currentTarget).get("email"));
          }}
        >
          <label>
            Email address
            <input
              name="email"
              type="email"
              required
              placeholder="you@company.com"
              autoComplete="email"
            />
          </label>
          <button className="primary" disabled={busy}>
            {busy ? "Sending…" : "Send login link"} <span>→</span>
          </button>
          <small className="form-note">
            Login links are single-use and expire.
          </small>
        </form>
      </section>
    </main>
  );
}