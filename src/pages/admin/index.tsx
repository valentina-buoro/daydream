import {useState} from 'react'

interface Application {
  id: string;
  name: string;
  email: string;
  company: string;
  message: string | null;
  created_at: string;
  status: "pending" | "approved" | "denied";
}

interface AdminProps {
  rows?: Application[];
  busy?: boolean;
  onDecide?: (application: Application, status: "approved" | "denied") => void;
}

export default function Admin({ rows = [], busy = false, onDecide }: AdminProps) {
  const [filter, setFilter] = useState("pending");
  const [query, setQuery] = useState("");

  const filtered = rows.filter(
    (r: Application) =>
      (filter === "all" || r.status === filter) &&
      `${r.name} ${r.email} ${r.company}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <main className="admin">
      <div className="eyebrow">ADMIN WORKSPACE</div>
      <div className="admin-title">
        <div>
          <h1>A thoughtful welcome.</h1>
          <p>Review introductions and decide who joins your community.</p>
        </div>
        <span className="outline-badge">Customer access</span>
      </div>
      <div className="stats">
        {["pending", "approved", "denied"].map((s) => (
          <button key={s} onClick={() => setFilter(s)}>
            <span>
              {s === "pending"
                ? "Awaiting review"
                : s === "approved"
                  ? "Approved customers"
                  : "Denied requests"}
            </span>
            <strong>
              {rows.filter((r: Application) => r.status === s).length}
            </strong>
            <small>
              {s === "pending"
                ? "Ready for your decision"
                : "Applications " + s}
            </small>
          </button>
        ))}
      </div>
      <div className="table-panel">
        <div className="table-controls">
          <div className="tabs">
            {["pending", "approved", "denied", "all"].map((s) => (
              <button
                className={filter === s ? "active" : ""}
                key={s}
                onClick={() => setFilter(s)}
              >
                {s === "all" ? "All requests" : s[0].toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <input
            aria-label="Search requests"
            placeholder="Search name, company, email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="table-heading">
          <span>CUSTOMER / BUSINESS</span>
          <span>REQUEST DETAILS</span>
          <span>STATUS / ACTION</span>
        </div>
        {filtered.map((r: Application) => (
          <article className="request-row" key={r.id}>
            <div className="identity">
              <div className="avatar">
                {r.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div>
                <strong>{r.name}</strong>
                <small>{r.company}</small>
                <a href={`mailto:${r.email}`}>{r.email}</a>
              </div>
            </div>
            <div className="request-details">
              <p>{r.message || "No additional message."}</p>
              <small>
                {new Date(r.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </small>
            </div>
            <div className="decisions">
              {r.status === "pending" ? (
                <>
                  <button
                    className="deny"
                    disabled={busy || !onDecide}
                    onClick={() => onDecide?.(r, "denied")}
                  >
                    Deny
                  </button>
                  <button
                    className="approve"
                    disabled={busy || !onDecide}
                    onClick={() => onDecide?.(r, "approved")}
                  >
                    Approve ↗
                  </button>
                </>
              ) : (
                <span className={`pill ${r.status}`}>{r.status}</span>
              )}
            </div>
          </article>
        ))}
        {!filtered.length && (
          <div className="empty">
            No requests here yet.
            <p>New introductions will appear in this space.</p>
          </div>
        )}
      </div>
    </main>
  );
}

