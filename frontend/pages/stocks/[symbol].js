import { useRouter } from "next/router"; import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar"; import StockChart from "@/components/StockChart";
const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";
export default function SymbolPage(){
  const { query:{symbol} } = useRouter(); const [data,setData]=useState([]); const t=typeof window!=="undefined"?localStorage.getItem("token"):null;
  useEffect(()=>{ if(symbol && t){ fetch(`${API}/stocks/${encodeURIComponent(symbol)}`,{headers:{Authorization:"Bearer "+t}}).then(r=>r.json()).then(setData); }},[symbol,t]);
  return (<div><Navbar/><div className="p-4">
    <h1 className="text-xl mb-3">{symbol}</h1>
    {!t? <p>Login to view.</p>: <StockChart data={data}/>}
  </div></div>);
}