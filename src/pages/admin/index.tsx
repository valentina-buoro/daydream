import CommerceAdmin from './commerce'
import {useEffect, useState} from 'react'
import { getClient, portal } from '../../lib/portal'
import type { CustomerRequest } from '../../types/enquiry_types'
import './styles.css'

interface AdminProps {
  rows?: CustomerRequest[];
  busy?: boolean;
  onDecide?: (application: CustomerRequest, status: "approved" | "denied") => void;
}

function Admin({ rows = [], busy = false, onDecide }: AdminProps) {
  const [filter, setFilter] = useState("pending");
  const [query, setQuery] = useState("");

  const filtered = rows.filter(
    (r: CustomerRequest) =>
      (filter === "all" || r.status === filter) &&
      `${r.name} ${r.email} ${r.company}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <main className="w-full border border-white/10 py-8 rounded-3xl bg-[linear-gradient(135deg,#ecfeff_0%,#f7fee7_52%,#fff1e6_100%)] shadow-[0_24px_70px_rgba(8,145,178,0.12),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-2xl px-13.75 text-left font-['DM_Sans',sans-serif] text-[#164e63] max-[850px]:px-6 [&_button]:cursor-pointer [&_button]:transition-colors [&_button]:duration-200 [&_button:disabled]:cursor-wait [&_button:disabled]:opacity-50">
      <div className="flex items-center gap-2 text-[10px] font-semibold tracking-[2px]">ADMIN WORKSPACE</div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mt-5 mb-2.5 font-['Libre_Caslon_Display',Georgia,serif] text-[52px] leading-[1.03] font-normal tracking-[-2.5px] max-[850px]:text-[42px]">Welcome.</h1>
          <p className="m-0 text-[13px] leading-[1.8] text-[#5f777b]">Review introductions and decide who joins your community.</p>
        </div>
        <span className="rounded-[30px] border border-[#a5f3fc] px-3.5 py-[9px] text-[11px] max-[850px]:hidden">Customer access</span>
      </div>
      <div className="my-[35px] grid grid-cols-3 gap-[18px] max-[850px]:gap-2">
        {["pending", "approved", "denied"].map((s) => (
          <button className="rounded-2xl border border-white/15 bg-white/8 shadow-[0_8px_24px_rgba(8,145,178,0.06),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-md hover:bg-white/15 p-[22px] text-left text-[#164e63] max-[850px]:p-4" key={s} onClick={() => setFilter(s)}>
            <span className="block text-[11px] text-[#5f777b]">
              {s === "pending"
                ? "Awaiting review"
                : s === "approved"
                  ? "Approved customers"
                  : "Denied requests"}
            </span>
            <strong className="my-3 block text-[38px] font-medium">
              {rows.filter((r: CustomerRequest) => r.status === s).length}
            </strong>
            <small className="block text-[10px] text-[#5f777b]">
              {s === "pending"
                ? "Ready for your decision"
                : "Applications " + s}
            </small>
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/10 shadow-[0_12px_36px_rgba(45,55,90,0.07),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-[#cffafe] px-6 py-5 max-[850px]:flex-col max-[850px]:items-stretch max-[850px]:gap-[15px]">
          <div className="flex gap-[7px]">
            {["pending", "approved", "denied", "all"].map((s) => (
              <button
                className={`rounded px-[13px] py-[9px] text-[11px] ${filter === s ? "bg-[#cffafe] text-[#0e7490]" : "bg-transparent text-[#5f777b]"}`}
                key={s}
                onClick={() => setFilter(s)}
              >
                {s === "all" ? "All requests" : s[0].toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <input
            className="m-0 block w-60 rounded-[5px] border border-[#a5f3fc] bg-white p-2.5 text-[11px] text-[#164e63] outline-none placeholder:text-[#789096] focus:border-[#0891b2] focus:shadow-[0_0_0_3px_rgba(8,145,178,0.10)] max-[850px]:w-full"
            aria-label="Search requests"
            placeholder="Search name, company, email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-[1.2fr_1fr_0.8fr] items-center gap-5 bg-white/5 px-6 py-5 text-[9px] tracking-[1px] text-[#5f777b] max-[850px]:hidden">
          <span>CUSTOMER / BUSINESS</span>
          <span>REQUEST DETAILS</span>
          <span>STATUS / ACTION</span>
        </div>
        {filtered.map((r: CustomerRequest) => (
          <article className="grid grid-cols-[1.2fr_1fr_0.8fr] items-center gap-5 border-t border-[#cffafe] px-6 py-5 max-[850px]:grid-cols-1" key={r.id}>
            <div className="flex items-center gap-3">
              <div className="grid size-[39px] shrink-0 place-items-center rounded-full bg-[#ffedd5] text-[11px] text-[#c2410c]">
                {r.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div>
                <strong className="my-3 block text-[38px] font-medium">{r.name}</strong>
                <small className="mt-1 block text-[10px] text-[#5f777b]">{r.company}</small>
                <a className="mt-1 block text-[10px] text-[#5f777b] no-underline" href={`mailto:${r.email}`}>{r.email}</a>
              </div>
            </div>
            <div className="max-[850px]:pl-[51px]">
              <p className="mt-0 mb-[7px] text-[11px] leading-[1.8] text-[#5f777b]">{r.message || "No additional message."}</p>
              <dl className="mb-3 space-y-1 text-[11px]">
                {Object.entries(r.details).map(([key, value]) => value !== null && value !== '' && <div key={key}><dt className="inline font-semibold">{key.replace(/([A-Z])/g, ' $1').replace(/^./, character => character.toUpperCase())}: </dt><dd className="inline break-words">{String(value)}</dd></div>)}
              </dl>
              <small className="text-[9px] text-[#789096]">
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
                    className="rounded border border-[#a5f3fc] bg-transparent px-3.5 py-2.5 text-[10px] text-[#5f777b]"
                    disabled={busy || !onDecide}
                    onClick={() => onDecide?.(r, "denied")}
                  >
                    Deny
                  </button>
                  <button
                    className="rounded bg-[#0891b2] px-3.5 py-2.5 text-[10px] text-white hover:bg-[#0e7490]"
                    disabled={busy || !onDecide}
                    onClick={() => onDecide?.(r, "approved")}
                  >
                    Approve ↗
                  </button>
                </>
              ) : (
                <span className={`rounded-[20px] px-3 py-[7px] text-[10px] capitalize ${r.status === "approved" ? "bg-[#ecfccb] text-[#3f6212]" : "bg-[#f3e9e2] text-[#98644d]"}`}>{r.status}</span>
              )}
            </div>
          </article>
        ))}
        {!filtered.length && (
          <div className="p-[50px] text-center text-[14px] text-[#5f777b]">
            No requests here yet.
            <p className="my-3 text-[12px] leading-[1.8] text-[#5f777b]">New introductions will appear in this space.</p>
          </div>
        )}
      </div>
    </main>
  );
}


export default function AdminPage() {
  const [rows, setRows] = useState<CustomerRequest[]>([])
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  async function load() {
    const data = await portal<{ requests: CustomerRequest[] }>({ action: 'list' })
    setRows(data.requests)
  }
  useEffect(() => {
    let active = true
    portal<{ requests: CustomerRequest[] }>({ action: 'list' }).then(data => {
      if (active) setRows(data.requests)
    }).catch(err => { if (active) setError(err.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  return <>
    <div className="flex justify-end gap-5 p-4 text-sm">
      <button disabled={busy} onClick={async () => { setBusy(true); setError(''); try { await load() } catch (err) { setError(err instanceof Error ? err.message : 'Could not refresh') } finally { setBusy(false) } }}>Refresh requests</button>
      <button onClick={() => { void getClient().auth.signOut() }}>Sign out</button>
    </div>
    {loading && <p role="status">Loading requests…</p>}
    {error && <p role="alert" className="p-4 text-red-800">{error}</p>}
    {notice && <p role="status" className="p-4">{notice}</p>}
    <Admin rows={rows} busy={busy || loading} onDecide={async (request, status) => {
      if (busy) return
      setBusy(true); setError(''); setNotice('')
      try {
        const result = await portal<{ email_sent?: boolean }>({ action: 'decide', id: request.id, status })
        setNotice(result.email_sent === false ? 'Approved, but the sign-in email could not be sent. The customer can request a new link on the login page.' : `Request ${status}.`)
        await load()
      } catch (err) { setError(err instanceof Error ? err.message : 'Could not update request') }
      finally { setBusy(false) }
    }} />
    <CommerceAdmin />
    {rows.filter(row => !row.notification_sent).map(row => <div className="mx-auto mb-3 text-sm" key={row.id}>
      Email notification not sent for {row.company}. <button className="underline" disabled={busy} onClick={async () => {
        setBusy(true); setError('')
        try { await portal({ action: 'retry-notification', id: row.id }); await load() }
        catch (err) { setError(err instanceof Error ? err.message : 'Email retry failed') }
        finally { setBusy(false) }
      }}>Retry notification</button>
    </div>)}
  </>
}
