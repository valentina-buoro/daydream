import {useState} from 'react'
import './styles.css'

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
    <main className="w-full  bg-[#f7f7f0] px-[55px] text-left font-['DM_Sans',sans-serif] text-[#233c34] max-[850px]:px-6 [&_button]:cursor-pointer [&_button]:transition-colors [&_button]:duration-200 [&_button:disabled]:cursor-wait [&_button:disabled]:opacity-50">
      <div className="flex items-center gap-2 text-[10px] font-semibold tracking-[2px]">ADMIN WORKSPACE</div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mt-5 mb-2.5 font-['Libre_Caslon_Display',Georgia,serif] text-[52px] leading-[1.03] font-normal tracking-[-2.5px] max-[850px]:text-[42px]">A thoughtful welcome.</h1>
          <p className="m-0 text-[13px] leading-[1.8] text-[#758071]">Review introductions and decide who joins your community.</p>
        </div>
        <span className="rounded-[30px] border border-[#dce2d1] px-3.5 py-[9px] text-[11px] max-[850px]:hidden">Customer access</span>
      </div>
      <div className="my-[35px] grid grid-cols-3 gap-[18px] max-[850px]:gap-2">
        {["pending", "approved", "denied"].map((s) => (
          <button className="rounded-lg border border-[#e0e4d6] bg-[#fffefa] p-[22px] text-left text-[#233c34] max-[850px]:p-4" key={s} onClick={() => setFilter(s)}>
            <span className="block text-[11px] text-[#838e76]">
              {s === "pending"
                ? "Awaiting review"
                : s === "approved"
                  ? "Approved customers"
                  : "Denied requests"}
            </span>
            <strong className="my-3 block text-[38px] font-medium">
              {rows.filter((r: Application) => r.status === s).length}
            </strong>
            <small className="block text-[10px] text-[#838e76]">
              {s === "pending"
                ? "Ready for your decision"
                : "Applications " + s}
            </small>
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-[9px] border border-[#e0e4d6] bg-[#fffefa]">
        <div className="flex items-center justify-between border-b border-[#e7e9df] px-6 py-5 max-[850px]:flex-col max-[850px]:items-stretch max-[850px]:gap-[15px]">
          <div className="flex gap-[7px]">
            {["pending", "approved", "denied", "all"].map((s) => (
              <button
                className={`rounded px-[13px] py-[9px] text-[11px] ${filter === s ? "bg-[#edf0e5] text-[#294c3a]" : "bg-transparent text-[#7d8871]"}`}
                key={s}
                onClick={() => setFilter(s)}
              >
                {s === "all" ? "All requests" : s[0].toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <input
            className="m-0 block w-60 rounded-[5px] border border-[#dce0d3] bg-[#fffefa] p-2.5 text-[11px] text-[#233c34] outline-none placeholder:text-[#a2a797] focus:border-[#6f8053] focus:shadow-[0_0_0_3px_#6f805315] max-[850px]:w-full"
            aria-label="Search requests"
            placeholder="Search name, company, email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-[1.2fr_1fr_0.8fr] items-center gap-5 bg-[#f7f8f1] px-6 py-5 text-[9px] tracking-[1px] text-[#89957c] max-[850px]:hidden">
          <span>CUSTOMER / BUSINESS</span>
          <span>REQUEST DETAILS</span>
          <span>STATUS / ACTION</span>
        </div>
        {filtered.map((r: Application) => (
          <article className="grid grid-cols-[1.2fr_1fr_0.8fr] items-center gap-5 border-t border-[#eaecdf] px-6 py-5 max-[850px]:grid-cols-1" key={r.id}>
            <div className="flex items-center gap-3">
              <div className="grid size-[39px] shrink-0 place-items-center rounded-full bg-[#e9eddc] text-[11px] text-[#76895c]">
                {r.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div>
                <strong className="my-3 block text-[38px] font-medium">{r.name}</strong>
                <small className="mt-1 block text-[10px] text-[#89927f]">{r.company}</small>
                <a className="mt-1 block text-[10px] text-[#89927f] no-underline" href={`mailto:${r.email}`}>{r.email}</a>
              </div>
            </div>
            <div className="max-[850px]:pl-[51px]">
              <p className="mt-0 mb-[7px] text-[11px] leading-[1.8] text-[#758071]">{r.message || "No additional message."}</p>
              <small className="text-[9px] text-[#a0a691]">
                {new Date(r.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </small>
            </div>
            <div className="flex justify-end gap-2 max-[850px]:justify-start">
              {r.status === "pending" ? (
                <>
                  <button
                    className="rounded border border-[#dce1d3] bg-transparent px-3.5 py-2.5 text-[10px] text-[#74806b]"
                    disabled={busy || !onDecide}
                    onClick={() => onDecide?.(r, "denied")}
                  >
                    Deny
                  </button>
                  <button
                    className="rounded bg-[#284b3c] px-3.5 py-2.5 text-[10px] text-white hover:bg-[#3f644e]"
                    disabled={busy || !onDecide}
                    onClick={() => onDecide?.(r, "approved")}
                  >
                    Approve ↗
                  </button>
                </>
              ) : (
                <span className={`rounded-[20px] px-3 py-[7px] text-[10px] capitalize ${r.status === "approved" ? "bg-[#e8efdf] text-[#53713e]" : "bg-[#f3e9e2] text-[#98644d]"}`}>{r.status}</span>
              )}
            </div>
          </article>
        ))}
        {!filtered.length && (
          <div className="p-[50px] text-center text-[14px] text-[#7c896e]">
            No requests here yet.
            <p className="my-3 text-[12px] leading-[1.8] text-[#758071]">New introductions will appear in this space.</p>
          </div>
        )}
      </div>
    </main>
  );
}

