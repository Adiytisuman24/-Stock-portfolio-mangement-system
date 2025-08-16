import { useState } from "react"; import Navbar from "@/components/Navbar";
const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";
export default function Login(){
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [err,setErr]=useState("");
  const submit=async(e)=>{e.preventDefault(); setErr("");
    const r=await fetch(API+"/auth/login",{method:"POST",headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    if(r.ok){ const j=await r.json(); localStorage.setItem("token",j.token); location.href="/"; } else setErr("Invalid credentials");
  };
  return (<div><Navbar/><div className="p-4 max-w-sm mx-auto">
    <h1 className="text-xl mb-3">Login</h1>
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input className="border p-2" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/>
      <input className="border p-2" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}/>
      <button className="bg-black text-white p-2 rounded">Login</button>
      {err && <p className="text-red-600">{err}</p>}
    </form></div></div>);
}