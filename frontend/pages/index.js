import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar"; import StockTable from "@/components/StockTable";
const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";
export default function Home(){
  const [rows,setRows]=useState([]); const [token,setToken]=useState(null);
  useEffect(()=>{ setToken(localStorage.getItem("token")); },[]);
  useEffect(()=>{ if(token){ fetch(API+"/stocks",{headers:{Authorization:"Bearer "+token}}).then(r=>r.json()).then(setRows); }},[token]);
  const go = (s)=> window.location.href="/stocks/"+encodeURIComponent(s);
  return (<div>
    <Navbar/>
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-3">Stocks (Latest)</h1>
      {!token? <p>Login to view data.</p>:<StockTable rows={rows} onClick={go}/>}
    </div>
  </div>);
}