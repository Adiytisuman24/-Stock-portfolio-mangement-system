import { useState } from "react"; import Navbar from "@/components/Navbar";
const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";
export default function Register(){
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [msg,setMsg]=useState("");
  const submit=async(e)=>{e.preventDefault();
    const r=await fetch(API+"/auth/register",{method:"POST",headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    setMsg(r.ok?"Registered! Now login.":"Failed");
  };
  return (<div><Navbar/><div className="p-4 max-w-sm mx-auto">
    <h1 className="text-xl mb-3">Register</h1>
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input className="border p-2" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/>
      <input className="border p-2" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}/>
      <button className="bg-black text-white p-2 rounded">Create account</button>
      {msg && <p>{msg}</p>}
      
    </form></div></div>);
  
}