import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { commerce, getClient } from "../../lib/portal";
import { money } from "../../types/commerce";
import type { DashboardData, Order, Profile } from "../../types/commerce";

const inputClass =
  "mt-2 block w-full rounded-xl border border-[#0891b2]/15 bg-white/70 px-4 py-3 text-sm outline-none focus:border-[#0891b2] focus:ring-2 focus:ring-[#0891b2]/10";
const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#0891b2] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0e7490] disabled:cursor-not-allowed disabled:opacity-40";
const panelClass =
  "rounded-3xl border border-white/60 bg-white/55 p-6 shadow-[0_12px_40px_#164e6308] backdrop-blur-xl sm:p-8";
const stages = ["received", "processing", "shipped", "delivered"] as const;
function errorText(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

export default function Account() {
  const location = useLocation();
  const page = location.pathname.endsWith("/products")
    ? "products"
    : location.pathname.endsWith("/orders")
    ? "orders"
    : location.pathname.endsWith("/profile")
    ? "profile"
    : "overview";
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [checkingOut, setCheckingOut] = useState(false);
  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setData(await commerce<DashboardData>({ action: "dashboard" }));
      setError("");
    } catch (error) {
      setError(errorText(error));
    } finally {
      setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    commerce<DashboardData>({ action: "dashboard" }).then((result) => {
      if (active) setData(result);
    }).catch((error) => {
      if (active) setError(errorText(error));
    });
    return () => {
      active = false;
    };
  }, []);
  const paymentReturn = new URLSearchParams(location.search).get("checkout");
  useEffect(() => {
    if (paymentReturn === "success") {
      try {
        sessionStorage.removeItem(`daydream-checkout:${data?.profile.email}`);
      } catch { /* Storage is optional. */ }
    }
  }, [paymentReturn, data?.profile.email]);
  useEffect(() => {
    if (page !== "orders") return;
    const interval = window.setInterval(() => {
      if (!document.hidden) void load();
    }, 15000);
    return () => window.clearInterval(interval);
  }, [page, load]);
  const products = data?.products || [];
  const cartItems = products.filter((p) => (cart[p.id] || 0) > 0);
  const caseCount = cartItems.reduce((sum, p) => sum + cart[p.id], 0);
  const total = cartItems.reduce(
    (sum, p) => sum + p.price_cents * cart[p.id],
    0,
  );
  async function checkout(order?: Order) {
    if (checkingOut) return;
    setCheckingOut(true);
    setError("");
    try {
      const items = order
        ? order.items.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
        }))
        : cartItems.map((p) => ({ product_id: p.id, quantity: cart[p.id] }));
      const fingerprint = JSON.stringify(items);
      const storageKey = `daydream-checkout:${data?.profile.email}`;
      let requestKey = order?.checkout_key;
      if (!requestKey) {
        let previous: { fingerprint?: string; key?: string } = {};
        try {
          previous = JSON.parse(sessionStorage.getItem(storageKey) || "{}");
        } catch {
          /* Start a new checkout if browser storage is unavailable. */
        }
        requestKey = previous.fingerprint === fingerprint && previous.key
          ? previous.key
          : crypto.randomUUID();
        try {
          sessionStorage.setItem(
            storageKey,
            JSON.stringify({ fingerprint, key: requestKey }),
          );
        } catch {
          /* Checkout can continue without persisted retries. */
        }
      }
      const result = await commerce<{ url: string }>({
        action: "checkout",
        request_key: requestKey,
        cart: items,
      });
      const url = new URL(result.url);
      if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com") {
        throw new Error("Unexpected checkout address.");
      }
      window.location.assign(url.href);
    } catch (error) {
      setError(errorText(error));
      setCheckingOut(false);
    }
  }
  return (
    <div className="min-h-[90vh] w-full rounded-xl bg-[linear-gradient(135deg,#ecfeff_0%,#f7fee7_45%,#fff1e6_100%)] text-left font-poppins text-[#164e63]">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#0891b2]/10 px-6 py-5 lg:px-10">
        <Link
          to="/account"
          className="font-athletics text-xl font-extrabold tracking-tight"
        >
          daydream<span className="ml-2 font-poppins text-xs font-normal tracking-[0.15em] text-[#5f777b]">
            WHOLESALE
          </span>
        </Link>
        <div className="flex items-center gap-5 text-xs">
          <span className="hidden sm:inline">
            {data?.profile.company || data?.profile.email}
          </span>
          <button
            className="underline underline-offset-4"
            onClick={async () => {
              try {
                const { error } = await getClient().auth.signOut();
                if (error) throw error;
              } catch (error) {
                setError(errorText(error));
              }
            }}
          >
            Sign out
          </button>
        </div>
      </header>
      <div className="flex flex-col lg:flex-row">
        <aside className="border-b border-[#0891b2]/10 p-4 lg:min-h-[80vh] lg:w-56 lg:shrink-0 lg:border-r lg:border-b-0 lg:px-5 lg:py-8">
          <p className="mb-5 hidden px-3 text-[10px] font-semibold tracking-[0.2em] text-[#4d686c] lg:block">
            YOUR WORKSPACE
          </p>
          <nav
            aria-label="Customer dashboard"
            className="flex gap-2 overflow-x-auto lg:flex-col"
          >
            {[["/account", "Overview"], ["/account/products", "Shop drinks"], [
              "/account/orders",
              "My orders",
            ], ["/account/profile", "My profile"]].map(([to, label]) => (
              <NavLink
                key={to}
                end
                to={to}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-xl px-4 py-3 text-sm transition ${
                    isActive
                      ? "bg-[#0891b2] text-white shadow-sm"
                      : "text-[#547075] hover:bg-white/60"
                  }`}
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-10 hidden rounded-2xl border border-white/70 bg-white/40 p-4 text-xs leading-6 lg:block">
            <span className="mb-1 block font-semibold">
              A little daydream, by the case.
            </span>Mix your favourites.<br />10-case minimum per order.
          </div>
        </aside>
        <main className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-10">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="mb-3 text-[10px] font-semibold tracking-[0.22em] text-[#4d686c]">
                THE DAYDREAM COMMUNITY
              </p>
              <h1 className="font-athletics text-3xl font-extrabold sm:text-4xl">
                {page === "overview"
                  ? `Hello${
                    data?.profile.full_name
                      ? ", " + data.profile.full_name.split(" ")[0]
                      : ""
                  }.`
                  : page === "products"
                  ? "Find your flavour."
                  : page === "orders"
                  ? "Your orders."
                  : "Make yourself at home."}
              </h1>
              <p className="mt-3 text-sm leading-6 text-[#5f777b]">
                {page === "products"
                  ? "Build a mixed order of at least 10 cases. All prices in CAD."
                  : page === "orders"
                  ? "Follow every order from payment to delivery."
                  : page === "profile"
                  ? "Keep your contact and business details up to date."
                  : "Good drinks, simple ordering, and everything in one place."}
              </p>
            </div>
            <button
              className="shrink-0 rounded-full border border-[#0891b2]/15 bg-white/40 px-4 py-2 text-xs disabled:opacity-40"
              disabled={refreshing}
              onClick={() => void load()}
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
          {error && (
            <p
              role="alert"
              className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              {error}
            </p>
          )}
          {!data && !error && <p role="status">Loading your workspace…</p>}
          {data && (
            <>
              {page === "overview" && (
                <>
                  <div className="mb-7 grid gap-4 sm:grid-cols-3">
                    {[["Orders placed", String(data.orders.length)], [
                      "On their way",
                      String(
                        data.orders.filter((o) =>
                          o.payment_status === "paid" &&
                          o.fulfillment_status === "shipped"
                        ).length,
                      ),
                    ], [
                      "Cases ordered",
                      String(
                        data.orders.filter((o) => o.payment_status === "paid")
                          .reduce((sum, o) =>
                            sum + o.cases, 0),
                      ),
                    ]].map(([label, value]) => (
                      <div className={panelClass} key={label}>
                        <p className="text-xs text-[#5f777b]">{label}</p>
                        <p className="mt-4 text-4xl font-medium">{value}</p>
                      </div>
                    ))}
                  </div>
                  <section
                    className={`${panelClass} mb-7 flex flex-col justify-between gap-6 sm:flex-row sm:items-center`}
                  >
                    <div>
                      <p className="mb-3 text-[10px] tracking-[0.2em]">
                        STOCK SOMETHING GOOD
                      </p>
                      <h2 className="text-2xl font-semibold">
                        Your next daydream starts here.
                      </h2>
                      <p className="mt-3 text-sm text-[#5f777b]">
                        Explore the drinks and mix a case order for your
                        business.
                      </p>
                    </div>
                    <Link className={buttonClass} to="/account/products">
                      Shop drinks →
                    </Link>
                  </section>
                  <div className="mb-4 flex justify-between">
                    <h2 className="text-lg font-semibold">Recent orders</h2>
                    <Link to="/account/orders" className="text-xs underline">
                      View all
                    </Link>
                  </div>
                  <OrderList
                    orders={data.orders.slice(0, 3)}
                    checkingOut={checkingOut}
                    onCheckout={checkout}
                  />
                </>
              )}
              {page === "products" && (
                <>
                  {products.some((p) => p.is_placeholder) && (
                    <p className="mb-6 rounded-xl bg-[#ffedd5] px-4 py-3 text-xs leading-6 text-[#9a3412]">
                      Preview catalog · drinks, case sizes, and prices are
                      placeholders. Use Stripe test payment details only.
                    </p>
                  )}
                  <div className="grid gap-7 xl:grid-cols-[1fr_310px]">
                    <div className="grid gap-5 sm:grid-cols-2">
                      {products.map((product, index) => (
                        <article
                          key={product.id}
                          className="overflow-hidden rounded-3xl border border-white/70 bg-white/55"
                        >
                          <div
                            className={`relative flex h-60 items-center justify-center ${
                              [
                                "bg-[#cffafe]",
                                "bg-[#ecfccb]",
                                "bg-[#f4e2d7]",
                                "bg-[#f7fee7]",
                              ][index % 4]
                            }`}
                          >
                            <img
                              className="h-48 max-w-[80%] object-contain drop-shadow-xl"
                              src={product.image_url}
                              alt={product.name}
                            />
                            <span className="absolute top-4 right-4 rounded-full bg-white/65 px-3 py-1.5 text-[10px]">
                              {product.cans_per_case} cans / case
                            </span>
                          </div>
                          <div className="p-6">
                            <h2 className="text-xl font-semibold">
                              {product.name}
                            </h2>
                            <p className="mt-2 min-h-10 text-xs leading-5 text-[#5f777b]">
                              {product.description}
                            </p>
                            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                              <p className="text-lg font-semibold">
                                {money(product.price_cents)}
                                <span className="ml-1 text-[10px] font-normal">
                                  / case
                                </span>
                              </p>
                              <label className="flex items-center gap-2 text-xs">
                                Cases<input
                                  aria-label={`${product.name} cases`}
                                  className="w-20 rounded-lg border border-[#0891b2]/15 bg-white/70 p-2 text-center"
                                  type="number"
                                  min="0"
                                  max="1000"
                                  step="1"
                                  value={cart[product.id] || 0}
                                  onChange={(e) =>
                                    setCart((current) => ({
                                      ...current,
                                      [product.id]: Math.max(
                                        0,
                                        Math.min(
                                          1000,
                                          Math.floor(
                                            Number(e.target.value) || 0,
                                          ),
                                        ),
                                      ),
                                    }))}
                                />
                              </label>
                            </div>
                          </div>
                        </article>
                      ))}
                      {!products.length && (
                        <p>
                          No drinks are available yet. Please check back soon.
                        </p>
                      )}
                    </div>
                    <aside className={`${panelClass} h-fit xl:sticky xl:top-6`}>
                      <p className="text-[10px] tracking-[0.2em]">
                        YOUR CASE ORDER
                      </p>
                      <h2 className="mt-3 text-2xl font-semibold">
                        A good mix.
                      </h2>
                      <div className="my-6 space-y-4">
                        {cartItems.length
                          ? cartItems.map((p) => (
                            <div
                              key={p.id}
                              className="flex justify-between gap-3 text-xs"
                            >
                              <span>
                                {p.name}
                                <small className="mt-1 block text-[#5f777b]">
                                  {cart[p.id]} cases × {money(p.price_cents)}
                                </small>
                              </span>
                              <span>{money(p.price_cents * cart[p.id])}</span>
                            </div>
                          ))
                          : (
                            <p className="text-xs leading-6 text-[#5f777b]">
                              Add your favourite drinks to get started.
                            </p>
                          )}
                      </div>
                      <div className="border-t border-[#0891b2]/15 pt-4">
                        <div className="flex justify-between text-sm">
                          <span>{caseCount} cases</span>
                          <strong>{money(total)} CAD</strong>
                        </div>
                        <p className="mt-3 text-xs text-[#5f777b]">
                          {caseCount < 10
                            ? `Add ${
                              10 - caseCount
                            } more cases to reach the minimum.`
                            : "Your order meets the 10-case minimum."}
                        </p>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#84cc16]/15">
                          <div
                            className="h-full rounded-full bg-[#84cc16] transition-all"
                            style={{
                              width: `${Math.min(100, caseCount * 10)}%`,
                            }}
                          />
                        </div>
                        <p className="my-4 text-[10px] leading-5 text-[#5f777b]">
                          Shipping address collected at checkout. No shipping
                          fee or tax is currently configured.
                        </p>
                        <button
                          className={`${buttonClass} w-full`}
                          disabled={caseCount < 10 || checkingOut}
                          onClick={() => void checkout()}
                        >
                          {checkingOut
                            ? "Opening Stripe…"
                            : "Continue to Stripe →"}
                        </button>
                        <p className="mt-3 text-center text-[10px] text-[#5f777b]">
                          Secure payment with Stripe
                        </p>
                      </div>
                    </aside>
                  </div>
                </>
              )}
              {page === "orders" && (
                <>
                  {paymentReturn && (
                    <p
                      role="status"
                      className="mb-6 rounded-xl bg-white/60 p-4 text-sm"
                    >
                      {paymentReturn === "success"
                        ? "Thanks! We are waiting for Stripe to confirm payment. Your order status updates automatically."
                        : "Checkout was cancelled. Your unpaid order is saved below so you can continue."}
                    </p>
                  )}
                  <OrderList
                    orders={data.orders}
                    checkingOut={checkingOut}
                    onCheckout={checkout}
                  />
                </>
              )}
              {page === "profile" && (
                <ProfileForm
                  key={data.profile.email}
                  profile={data.profile}
                  onSaved={load}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function ProfileForm(
  { profile, onSaved }: { profile: Profile; onSaved: () => Promise<void> },
) {
  const [form, setForm] = useState(profile);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      await commerce({
        action: "profile",
        full_name: form.full_name,
        company: form.company,
        phone: form.phone,
      });
      await onSaved();
      setNotice("Your profile has been saved.");
    } catch (error) {
      setNotice(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className={`${panelClass} max-w-2xl`} onSubmit={save}>
      <h2 className="mb-6 text-xl font-semibold">Contact details</h2>
      <label className="mb-5 block text-xs font-medium">
        Email<input
          className={`${inputClass} opacity-65`}
          type="email"
          value={profile.email}
          readOnly
        />
        <span className="mt-2 block text-[10px] font-normal text-[#5f777b]">
          Your approved sign-in email. Contact the team to change it.
        </span>
      </label>
      {([["full_name", "Full name", 120], [
        "company",
        "Business / event name",
        160,
      ], ["phone", "Phone number", 100]] as const).map((
        [field, label, max],
      ) => (
        <label key={field} className="mb-5 block text-xs font-medium">
          {label}
          <input
            className={inputClass}
            maxLength={max}
            type={field === "phone" ? "tel" : "text"}
            value={form[field]}
            onChange={(e) =>
              setForm((current) => ({ ...current, [field]: e.target.value }))}
          />
        </label>
      ))}
      <p className="mb-6 text-xs leading-6 text-[#5f777b]">
        Delivery addresses are collected securely for each order at checkout.
      </p>
      <button disabled={busy} className={buttonClass}>
        {busy ? "Saving…" : "Save profile"}
      </button>
      {notice && <p role="status" className="mt-4 text-sm">{notice}</p>}
    </form>
  );
}

function OrderList(
  { orders, checkingOut, onCheckout }: {
    orders: Order[];
    checkingOut: boolean;
    onCheckout: (order: Order) => Promise<void>;
  },
) {
  if (!orders.length) {
    return (
      <div className={`${panelClass} text-center`}>
        <h2 className="text-xl font-semibold">Your first case is waiting.</h2>
        <p className="my-4 text-sm text-[#5f777b]">
          Orders and delivery updates will appear here.
        </p>
        <Link className={buttonClass} to="/account/products">
          Explore drinks →
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      {orders.map((order) => (
        <article key={order.id} className={panelClass}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold">
                Order #{order.id.slice(0, 8).toUpperCase()}
              </h2>
              <p className="mt-2 text-xs text-[#5f777b]">
                {new Date(order.created_at).toLocaleDateString("en-CA", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })} · {order.cases} cases
              </p>
            </div>
            <div className="text-right">
              <span className="rounded-full bg-[#fed7aa]/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider">
                {order.payment_status === "paid"
                  ? order.fulfillment_status
                  : order.payment_status === "pending"
                  ? "Awaiting payment"
                  : order.payment_status}
              </span>
              <p className="mt-3 font-semibold">
                {money(order.total_cents)} CAD
              </p>
            </div>
          </div>
          <div className="my-5 border-y border-[#0891b2]/10 py-4 text-xs leading-7">
            {order.items.map((item) => (
              <div key={item.product_id} className="flex justify-between gap-3">
                <span>{item.name} · {item.quantity} cases</span>
                <span>{money(item.price_cents * item.quantity)}</span>
              </div>
            ))}
          </div>
          {order.payment_status === "paid" && (
            <ol
              aria-label="Order progress"
              className="my-6 grid grid-cols-4 gap-2"
            >
              {stages.map((stage, index) => (
                <li key={stage} className="text-[9px] capitalize sm:text-xs">
                  <div
                    className={`mb-3 h-1.5 rounded-full ${
                      stages.indexOf(order.fulfillment_status) >= index
                        ? "bg-[#84cc16]"
                        : "bg-[#84cc16]/15"
                    }`}
                  />
                  {stage}
                </li>
              ))}
            </ol>
          )}
          {order.tracking_number && (
            <p className="text-xs">{order.carrier} · {order.tracking_number}</p>
          )}
          {order.tracking_url && /^https:\/\//i.test(order.tracking_url) && (
            <a
              className="mt-3 inline-block text-xs underline"
              href={order.tracking_url}
              target="_blank"
              rel="noreferrer"
            >
              Track shipment ↗
            </a>
          )}
          {order.payment_status === "pending" && (
            <button
              className={buttonClass}
              disabled={checkingOut}
              onClick={() => void onCheckout(order)}
            >
              {checkingOut ? "Opening Stripe…" : "Continue payment →"}
            </button>
          )}
        </article>
      ))}
    </div>
  );
}
