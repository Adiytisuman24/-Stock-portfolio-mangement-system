import { useEffect, useState } from "react"; import Navbar from "@/components/Navbar";
const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";
export default function Portfolio() {
  const [items, setItems] = useState([]); const [sym, setSym] = useState(""); const [qty, setQty] = useState(0); const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = t ? { Authorization: "Bearer " + t, 'Content-Type': 'application/json' } : {};
  const load = () => t && fetch(API + "/portfolio", { headers }).then(r => r.json()).then(setItems);
  useEffect(load, []);
  const add = async () => { await fetch(API + "/portfolio", { method: "POST", headers, body: JSON.stringify({ symbol: sym, quantity: Number(qty) }) }); setSym(""); setQty(0); load(); }
  const total = items.reduce((s, i) => s + (i.quantity * (i.lastPrice || 0)), 0);
  return (<div><Navbar /><div className="p-4 max-w-2xl mx-auto">
    <h1 className="text-xl mb-3">My Portfolio</h1>
    {!t ? <p>Login to manage portfolio.</p> : null}
    <div>
      <div className="flex gap-2 mb-4">
        <input className="border p-2 flex-1" placeholder="Symbol (e.g., AAPL or RELIANCE.NS)" value={sym} onChange={e => setSym(e.target.value)} />
        <input className="border p-2 w-32" type="number" step="0.01" value={qty} onChange={e => setQty(e.target.value)} />
        <button className="bg-black text-white px-4" onClick={add}>Add</button>
      </div>
      <table className="w-full text-sm">
        <thead><tr><th>Symbol</th><th>Qty</th><th>Last Price</th><th>Value</th></tr></thead>
        <tbody>{items.map((i, k) => (<tr key={k}><td>{i.symbol}</td><td>{i.quantity}</td><td>{i.lastPrice ?? "-"}</td><td>{((i.lastPrice || 0) * i.quantity).toFixed(2)}</td></tr>))}</tbody>
        <tfoot><tr><td colSpan="3" className="text-right">Total:</td><td>{total.toFixed(2)}</td></tr></tfoot>
      </table>
      <div className="mt-3 font-semibold">Total: {total.toFixed(2)}</div>
    </div>
  </div></div>);
}