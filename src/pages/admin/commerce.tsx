import { useEffect, useState } from "react";
import { commerce } from "../../lib/portal";
import type { Order, Product } from "../../types/commerce";
import { money } from "../../types/commerce";
const field = "rounded-lg border border-white/40 bg-white/40 px-3 py-2 text-sm";
const button =
  "rounded-lg bg-[#0891b2] px-4 py-2 text-xs text-white transition hover:bg-[#0e7490] disabled:opacity-40";
export default function CommerceAdmin() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tab, setTab] = useState("orders");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function load() {
    const [orderData, productData] = await Promise.all([
      commerce<{ orders: Order[] }>({ action: "admin-orders" }),
      commerce<{ products: Product[] }>({ action: "admin-catalog" }),
    ]);
    setOrders(orderData.orders);
    setProducts(productData.products);
  }
  useEffect(() => {
    let active = true;
    Promise.all([
      commerce<{ orders: Order[] }>({ action: "admin-orders" }),
      commerce<{ products: Product[] }>({ action: "admin-catalog" }),
    ]).then(([a, b]) => {
      if (active) {
        setOrders(a.orders);
        setProducts(b.products);
      }
    }).catch((error) => {
      if (active) setError(error.message);
    });
    return () => {
      active = false;
    };
  }, []);
  async function save(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await commerce(body);
      await load();
      setNotice("Changes saved.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to save");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="my-8 rounded-3xl border border-white/20 bg-white/10 p-6 text-left text-[#164e63] backdrop-blur-xl sm:p-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold">Store management</h2>
        <button
          disabled={busy}
          className="text-xs underline"
          onClick={async () => {
            setBusy(true);
            try {
              await load();
              setError("");
            } catch (error) {
              setError(
                error instanceof Error ? error.message : "Unable to refresh",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          Refresh store
        </button>
      </div>
      <div className="mb-6 flex gap-3">
        {["orders", "catalog"].map((value) => (
          <button
            className={`${field} ${
              tab === value ? "bg-white/60 font-semibold" : ""
            }`}
            key={value}
            onClick={() => setTab(value)}
          >
            {value === "orders" ? "Customer orders" : "Product catalog"}
          </button>
        ))}
      </div>
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {notice && <p role="status" className="mb-4 text-sm">{notice}</p>}
      {tab === "orders" && (
        <div className="space-y-5">
          {!orders.length && <p className="text-sm">No orders yet.</p>}
          {orders.map((order) => (
            <form
              className="rounded-2xl border border-white/30 bg-white/25 p-5"
              key={order.id}
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                void save({
                  action: "fulfill",
                  id: order.id,
                  status: form.get("status"),
                  carrier: form.get("carrier"),
                  tracking_number: form.get("tracking_number"),
                  tracking_url: form.get("tracking_url"),
                });
              }}
            >
              <div className="mb-4 flex flex-wrap justify-between gap-3">
                <div>
                  <h3 className="font-semibold">
                    #{order.id.slice(0, 8).toUpperCase()} ·{" "}
                    {order.customers?.email}
                  </h3>
                  <p className="mt-2 text-xs">
                    {order.cases} cases · {money(order.total_cents)} CAD ·{" "}
                    {order.payment_status}
                  </p>
                </div>
                <small>
                  {new Date(order.created_at).toLocaleDateString("en-CA")}
                </small>
              </div>
              <ul className="mb-4 text-xs leading-6">
                {order.items.map((item) => (
                  <li key={item.product_id}>{item.quantity} × {item.name}</li>
                ))}
              </ul>
              {order.shipping_details && (
                <address className="mb-4 text-xs leading-6 not-italic">
                  <strong>Ship to:</strong>
                  {order.shipping_details.name}
                  <br />
                  {Object.values(order.shipping_details.address || {}).filter(
                    Boolean,
                  ).join(", ")}
                </address>
              )}
              <fieldset
                disabled={busy || order.payment_status !== "paid"}
                className="grid gap-3 disabled:opacity-50 sm:grid-cols-2"
              >
                <label className="grid gap-2 text-xs">
                  Fulfillment<select
                    className={field}
                    name="status"
                    defaultValue={order.fulfillment_status}
                  >
                    {["received", "processing", "shipped", "delivered"].map(
                      (status) => <option key={status}>{status}</option>,
                    )}
                  </select>
                </label>
                <label className="grid gap-2 text-xs">
                  Carrier<input
                    name="carrier"
                    className={field}
                    maxLength={120}
                    defaultValue={order.carrier}
                  />
                </label>
                <label className="grid gap-2 text-xs">
                  Tracking number<input
                    name="tracking_number"
                    className={field}
                    maxLength={200}
                    defaultValue={order.tracking_number}
                  />
                </label>
                <label className="grid gap-2 text-xs">
                  Tracking URL (HTTPS)<input
                    name="tracking_url"
                    className={field}
                    type="url"
                    pattern="https://.*"
                    defaultValue={order.tracking_url}
                  />
                </label>
                <button className={`${button} w-fit`}>Save shipment</button>
              </fieldset>
            </form>
          ))}
        </div>
      )}
      {tab === "catalog" && (
        <>
          <p className="mb-5 text-xs leading-6">
            Prices are per case in CAD. Placeholder products only accept Stripe
            test payments. Replace their details and turn off “Placeholder”
            before selling live.
          </p>
          <div className="grid gap-5 lg:grid-cols-2">
            {products.map((product) => (
              <form
                key={product.id}
                className="rounded-2xl border border-white/30 bg-white/25 p-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  void save({
                    action: "catalog-update",
                    id: product.id,
                    name: form.get("name"),
                    description: form.get("description"),
                    price_cents: Math.round(Number(form.get("price")) * 100),
                    cans_per_case: Number(form.get("cans")),
                    active: form.has("active"),
                    is_placeholder: form.has("placeholder"),
                  });
                }}
              >
                <div className="mb-4 flex items-center gap-4">
                  <img
                    src={product.image_url}
                    alt=""
                    className="size-16 object-contain"
                  />
                  <h3 className="font-semibold">{product.name}</h3>
                </div>
                <fieldset disabled={busy} className="grid gap-3">
                  <label className="grid gap-2 text-xs">
                    Name<input
                      name="name"
                      className={field}
                      defaultValue={product.name}
                      required
                      maxLength={120}
                    />
                  </label>
                  <label className="grid gap-2 text-xs">
                    Description<textarea
                      name="description"
                      className={field}
                      defaultValue={product.description}
                      maxLength={1000}
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-2 text-xs">
                      CAD per case<input
                        name="price"
                        type="number"
                        min="0.01"
                        max="10000"
                        step="0.01"
                        className={field}
                        defaultValue={product.price_cents / 100}
                        required
                      />
                    </label>
                    <label className="grid gap-2 text-xs">
                      Cans per case<input
                        name="cans"
                        type="number"
                        min="1"
                        max="100"
                        step="1"
                        className={field}
                        defaultValue={product.cans_per_case}
                        required
                      />
                    </label>
                  </div>
                  <label className="text-xs">
                    <input
                      type="checkbox"
                      name="active"
                      defaultChecked={product.active}
                    />{" "}
                    Available to order
                  </label>
                  <label className="text-xs">
                    <input
                      type="checkbox"
                      name="placeholder"
                      defaultChecked={product.is_placeholder}
                    />{" "}
                    Placeholder / test product
                  </label>
                  <button className={`${button} w-fit`}>Save product</button>
                </fieldset>
              </form>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
