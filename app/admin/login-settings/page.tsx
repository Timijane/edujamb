"use client";

import { FormEvent, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { defaultSiteSettings, SiteSettings } from "@/lib/site-settings";
import { useRouter } from "next/navigation";

export default function LoginSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SiteSettings>(defaultSiteSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace("/admin/login"); return; }
      try {
        const snap = await getDoc(doc(db, "adminUsers", user.uid));
        if (!snap.exists() || snap.data().active !== true || snap.data().role !== "super_admin") {
          await signOut(auth); router.replace("/login"); return;
        }
        const siteSnap = await getDoc(doc(db, "siteSettings", "site"));
        if (siteSnap.exists()) setSettings({ ...defaultSiteSettings, ...(siteSnap.data() as SiteSettings) });
      } catch (e) { setError("Unable to load login settings."); }
      finally { setLoading(false); }
    });
    return () => unsub();
  }, [router]);

  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage(""); setError("");
    try {
      await setDoc(doc(db, "siteSettings", "site"), { ...settings, updatedAt: serverTimestamp() }, { merge: true });
      setMessage("Login experience updated successfully.");
    } catch { setError("Unable to save login settings."); } finally { setSaving(false); }
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center"><p className="font-bold text-indigo-700">Loading login settings...</p></main>;

  return <main className="min-h-screen bg-slate-50">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4"><div><p className="text-xs font-black uppercase tracking-widest text-indigo-600">Super Admin</p><h1 className="text-2xl font-black">Login Experience</h1></div><button onClick={()=>router.push("/admin")} className="rounded-xl border px-4 py-2 text-sm font-bold">Back to Admin</button></div></header>
    <section className="mx-auto max-w-5xl px-5 py-8">
      <div className="mb-6 rounded-3xl border border-indigo-100 bg-gradient-to-r from-slate-950 via-indigo-950 to-cyan-950 p-7 text-white shadow-xl"><p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Shared Authentication</p><h2 className="mt-2 text-3xl font-black">Make the login feel like EduJAMB.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">Control the public login page without changing code. The same login securely resolves student, teacher, supporter, co-admin and Super Admin accounts on the server.</p></div>
      <form onSubmit={save} className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl bg-white p-6 shadow-sm"><h3 className="text-xl font-black">Visual settings</h3><div className="mt-5 space-y-5">
          <label className="block"><span className="mb-2 block text-sm font-bold">Background type</span><select value={settings.loginBackgroundType} onChange={e=>setSettings({...settings, loginBackgroundType:e.target.value as SiteSettings["loginBackgroundType"]})} className="w-full rounded-xl border px-4 py-3.5"><option value="gradient">Artistic gradient</option><option value="color">Solid colour</option><option value="image">Uploaded image</option></select></label>
          <label className="block"><span className="mb-2 block text-sm font-bold">Background colour</span><input type="color" value={settings.loginBackgroundColor || "#f8fafc"} onChange={e=>setSettings({...settings, loginBackgroundColor:e.target.value})} className="h-12 w-full rounded-xl border bg-white p-1" /></label>
          <label className="block"><span className="mb-2 block text-sm font-bold">Image overlay opacity</span><input type="range" min="0" max="0.7" step="0.01" value={settings.loginOverlayOpacity ?? 0.18} onChange={e=>setSettings({...settings, loginOverlayOpacity:Number(e.target.value)})} className="w-full" /><span className="text-xs text-slate-400">{Math.round((settings.loginOverlayOpacity ?? 0.18)*100)}%</span></label>
          <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-sm text-cyan-900"><b>Background image:</b> upload and assign a <b>Login Background</b> image from Admin → Media Manager.</div>
        </div></div>
        <div className="rounded-3xl bg-white p-6 shadow-sm"><h3 className="text-xl font-black">Login copy</h3><div className="mt-5 space-y-5">
          <Field label="Eyebrow" value={settings.loginEyebrow || ""} onChange={v=>setSettings({...settings, loginEyebrow:v})} />
          <Field label="Title" value={settings.loginTitle || ""} onChange={v=>setSettings({...settings, loginTitle:v})} />
          <label className="block"><span className="mb-2 block text-sm font-bold">Subtitle</span><textarea rows={4} value={settings.loginSubtitle || ""} onChange={e=>setSettings({...settings, loginSubtitle:e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-3.5 outline-none focus:border-indigo-500" /></label>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs leading-5 text-slate-500">The logo is already controlled by the existing Media Manager. Changing the main site logo automatically updates the shared login page.</div>
        </div></div>
        <div className="lg:col-span-2">{message&&<div className="mb-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}{error&&<div className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}<button disabled={saving} className="rounded-2xl bg-slate-950 px-7 py-4 font-black text-white shadow-xl disabled:opacity-60">{saving?"Saving...":"Save Login Experience"}</button></div>
      </form>
    </section>
  </main>;
}

function Field({label,value,onChange}:{label:string;value:string;onChange:(value:string)=>void}){return <label className="block"><span className="mb-2 block text-sm font-bold">{label}</span><input value={value} onChange={e=>onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3.5 outline-none focus:border-indigo-500" /></label>}
