"use client";

import { FormEvent, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

type Member = { uid: string; type: string; email: string; displayName?: string; role: string; active: boolean };

export default function TeamPage() {
  const router = useRouter();
  const [members,setMembers]=useState<Member[]>([]);
  const [displayName,setDisplayName]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [role,setRole]=useState("admin");
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);

  async function token(){if(!auth.currentUser) throw new Error("Not signed in.");return auth.currentUser.getIdToken();}

  async function load(){
    try{const t=await token();const r=await fetch("/api/admin/team",{headers:{Authorization:`Bearer ${t}`}});const d=await r.json();if(!r.ok)throw new Error(d.message);setMembers(d.members||[]);}
    catch(e){setError(e instanceof Error?e.message:"Unable to load team.");}finally{setLoading(false);}
  }

  useEffect(()=>onAuthStateChanged(auth,async u=>{if(!u){router.replace("/admin/login");return;}const s=await fetch("/api/admin/team",{headers:{Authorization:`Bearer ${await u.getIdToken()}`}});if(s.status===403){router.replace("/admin");return;}load();}),[router]);

  async function create(e:FormEvent){e.preventDefault();setError("");setMessage("");setSaving(true);try{const t=await token();const r=await fetch("/api/admin/team",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${t}`},body:JSON.stringify({displayName,email,password,role})});const d=await r.json();if(!r.ok)throw new Error(d.message);setMessage(`${role} account created. The person can now use the appropriate portal login.`);setDisplayName("");setEmail("");setPassword("");await load();}catch(e){setError(e instanceof Error?e.message:"Unable to create account.");}finally{setSaving(false);}}

  async function toggle(uid:string,active:boolean){setError("");try{const t=await token();const r=await fetch(`/api/admin/team/${uid}`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${t}`},body:JSON.stringify({active:!active})});const d=await r.json();if(!r.ok)throw new Error(d.message);await load();}catch(e){setError(e instanceof Error?e.message:"Unable to update account.");}}

  if(loading)return <main className="flex min-h-screen items-center justify-center"><p className="font-bold text-violet-700">Loading team management...</p></main>;

  return <main className="min-h-screen bg-[#f7f5ff]"><header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4"><div><p className="text-xs font-black uppercase tracking-widest text-violet-600">Super Admin</p><h1 className="text-2xl font-black">Team Management</h1></div><button onClick={()=>router.push("/admin")} className="rounded-xl border px-4 py-2 text-sm font-bold">Back to Admin</button></div></header><section className="mx-auto max-w-6xl px-5 py-8"><div className="grid gap-6 lg:grid-cols-[380px_1fr]"><div className="rounded-2xl bg-white p-6 shadow-sm"><h2 className="text-xl font-black">Add Team Member</h2><p className="mt-2 text-sm leading-6 text-gray-500">Only the Super Admin can create these accounts. Passwords are stored by Firebase Authentication, never in Firestore.</p><form onSubmit={create} className="mt-6 space-y-4"><Field label="Full name" value={displayName} set={setDisplayName}/><Field label="Gmail / email" type="email" value={email} set={setEmail}/><Field label="Temporary password" type="password" value={password} set={setPassword}/><label className="block"><span className="mb-2 block text-sm font-bold">Role</span><select value={role} onChange={e=>setRole(e.target.value)} className="w-full rounded-xl border px-4 py-3.5"><option value="admin">Co-Admin</option><option value="supporter">Supporter</option><option value="teacher">Teacher</option></select></label>{message&&<div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}{error&&<div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}<button disabled={saving} className="w-full rounded-xl bg-violet-700 px-5 py-4 font-black text-white disabled:opacity-60">{saving?"Creating...":"Create Account"}</button></form></div><div className="rounded-2xl bg-white p-6 shadow-sm"><h2 className="text-xl font-black">Existing Team</h2><p className="mt-2 text-sm text-gray-500">Disable access instantly without deleting the Firebase account.</p><div className="mt-6 space-y-3">{members.map(m=><div key={m.uid} className="flex flex-col gap-3 rounded-xl border border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black">{m.displayName||"Unnamed"}</p><p className="text-sm text-gray-500">{m.email}</p><p className="mt-1 text-xs font-bold uppercase tracking-wider text-violet-600">{m.role}</p></div><button onClick={()=>toggle(m.uid,m.active)} className={`rounded-lg px-3 py-2 text-sm font-bold ${m.active?"border border-red-200 text-red-700":"bg-green-600 text-white"}`}>{m.active?"Disable":"Enable"}</button></div>)}{members.length===0&&<p className="rounded-xl bg-gray-50 p-5 text-sm text-gray-500">No delegated accounts yet.</p>}</div></div></div></section></main>
}
function Field({label,value,set,type="text"}:{label:string;value:string;set:(v:string)=>void;type?:string}){return <label className="block"><span className="mb-2 block text-sm font-bold">{label}</span><input required type={type} value={value} onChange={e=>set(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 outline-none focus:border-violet-600"/></label>}
