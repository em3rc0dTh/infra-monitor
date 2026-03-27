"use client";
import { useState, useEffect, useMemo } from "react";
import api from "@/lib/api";
import LatencyChart from "@/components/LatencyChart";
import { ArrowLeft, Trash2, Edit, AlertCircle, CheckCircle, Clock, Shield, Globe, Mail, Save, X, Settings, Bell } from "lucide-react";
import { useRouter, useParams } from "next/navigation";

export default function TargetDetailPage() {
   const params = useParams();
   const id = params?.id;
   const router = useRouter();
   const [target, setTarget] = useState<any>(null);
   const [logs, setLogs] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [editing, setEditing] = useState(false);

   // Edit State
   const [editName, setEditName] = useState("");
   const [editIp, setEditIp] = useState("");
   const [editDomain, setEditDomain] = useState("");
   const [editEmail, setEditEmail] = useState("");

   const fetchData = async () => {
      if (!id || id === "undefined") return;
      try {
         const [{ data: tData }, { data: lData }] = await Promise.all([
            api.get(`/targets/${id}`),
            api.get(`/targets/${id}/logs`)
         ]);

         if (tData) {
            setTarget(tData);
            // Initialize edit state
            setEditName(tData.name || "");
            setEditIp(tData.ip || "");
            setEditDomain(tData.domain || "");
            setEditEmail(tData.notification_email || "");
         }

         if (Array.isArray(lData)) {
            setLogs(lData);
         }
      } catch (err: any) {
         console.error("Fetch Data Error:", err);
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      if (id) {
         fetchData();
         const interval = setInterval(fetchData, 30000);
         return () => clearInterval(interval);
      }
   }, [id]);

   const handleDelete = async () => {
      if (!confirm("Se eliminará este servidor y sus registros. ¿Continuar?")) return;
      try {
         await api.delete(`/targets/${id}`);
         router.push('/dashboard');
      } catch (err) {
         alert("Error al eliminar");
      }
   };

   const handleUpdate = async () => {
      try {
         await api.put(`/targets/${id}`, {
            name: editName,
            ip: editIp,
            domain: editDomain,
            notification_email: editEmail
         });
         setEditing(false);
         fetchData();
      } catch (err) {
         alert("Error al actualizar");
      }
   };

   const chartData = useMemo(() => {
      return logs.slice().reverse().map(l => ({
         label: new Date(l.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
         ms: l.domain_ms
      }));
   }, [logs]);

   const uptimePercentage = useMemo(() => {
      if (logs.length === 0) return 100;
      const okCount = logs.filter(l => l.diag_level === 'ok').length;
      return Math.round((okCount / logs.length) * 100);
   }, [logs]);

   if (loading) return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
         <Clock className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
   );

   if (!target) return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-10">
         <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
         <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">Error al cargar datos</h2>
         <p className="text-slate-500 text-center max-w-sm mb-8">No se pudo encontrar la información del servidor. Verifica la ID o tu conexión.</p>
         <button onClick={() => router.push('/dashboard')} className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-black font-bold rounded-2xl transition-all hover:scale-105 active:scale-95">Volver al Dashboard</button>
      </div>
   );

   return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-10 font-sans selection:bg-indigo-100">
         <div className="max-w-6xl mx-auto">

            {/* Top Nav */}
            <div className="flex items-center justify-between mb-8">
               <button
                  onClick={() => router.push('/dashboard')}
                  className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-all group px-4 py-2 hover:bg-white dark:hover:bg-slate-900 rounded-xl"
               >
                  <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                  <span className="font-bold">Volver al Dashboard</span>
               </button>
               <div className="flex gap-3">
                  <button
                     onClick={() => setEditing(!editing)}
                     className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-600 transition-all hover:shadow-lg"
                  >
                     <Edit className="w-5 h-5" />
                  </button>
                  <button
                     onClick={handleDelete}
                     className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-rose-100 dark:border-rose-900/50 text-rose-400 hover:text-rose-600 transition-all hover:shadow-lg hover:shadow-rose-100/50"
                  >
                     <Trash2 className="w-5 h-5" />
                  </button>
               </div>
            </div>

            {/* Page Header */}
            <div className="flex flex-col lg:flex-row gap-8 items-start mb-10">
               <div className="flex-1">
                  {editing ? (
                     <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-xl border border-slate-200 dark:border-slate-800 lg:w-[480px]">
                        <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                           <Settings className="w-6 h-6 text-indigo-500" /> Editar Configuración
                        </h3>
                        <div className="space-y-4">
                           <div>
                              <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block px-1">Alias / Nombre</label>
                              <input className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-3xl border-none outline-none focus:ring-2 focus:ring-indigo-500" value={editName} onChange={e => setEditName(e.target.value)} />
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                              <div>
                                 <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block px-1">Dirección IP</label>
                                 <input className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-3xl border-none outline-none focus:ring-2 focus:ring-indigo-500" value={editIp} onChange={e => setEditIp(e.target.value)} />
                              </div>
                              <div>
                                 <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block px-1">Dominio URL</label>
                                 <input className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-3xl border-none outline-none focus:ring-2 focus:ring-indigo-500" value={editDomain} onChange={e => setEditDomain(e.target.value)} />
                              </div>
                           </div>
                           <div>
                              <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block px-1">Notificar Correo</label>
                              <input className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-3xl border-none outline-none focus:ring-2 focus:ring-indigo-500" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                           </div>
                           <div className="flex gap-2 pt-4">
                              <button onClick={handleUpdate} className="flex-1 bg-indigo-600 text-white font-bold py-4 rounded-3xl shadow-lg shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-2 hover:bg-indigo-700">
                                 <Save className="w-5 h-5" /> Guardar
                              </button>
                              <button onClick={() => setEditing(false)} className="px-6 bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold rounded-3xl hover:bg-slate-200 transition-all">
                                 <X className="w-5 h-5" />
                              </button>
                           </div>
                        </div>
                     </div>
                  ) : (
                     <>
                        <div className="flex items-center gap-4 mb-3">
                           <h1 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tighter">{target.name}</h1>
                           <div className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest ${logs[0]?.diag_level === 'ok' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {logs[0]?.diag_level ?? 'S/D'}
                           </div>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-lg font-medium flex gap-6 items-center flex-wrap">
                           <span className="flex items-center gap-2"><Shield className="w-5 h-5 text-indigo-400 opacity-60" /> {target.ip}</span>
                           <span className="flex items-center gap-2"><Globe className="w-5 h-5 text-indigo-400 opacity-60" /> {target.domain}</span>
                           <span className="flex items-center gap-2"><Mail className="w-5 h-5 text-indigo-400 opacity-60" /> {target.notification_email}</span>
                        </p>
                     </>
                  )}
               </div>

               {/* Metric Cards */}
               <div className="flex gap-4 w-full lg:w-auto">
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-[35px] border border-slate-200 dark:border-slate-800 flex-1 lg:w-48 shadow-sm">
                     <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Uptime Total</p>
                     <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{uptimePercentage}%</span>
                        <span className="text-xs font-bold text-emerald-500">+0.2%</span>
                     </div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-[35px] border border-slate-200 dark:border-slate-800 flex-1 lg:w-48 shadow-sm">
                     <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Promedio</p>
                     <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                           {logs[0]?.domain_ms ? `${logs[0].domain_ms}ms` : '—'}
                        </span>
                        <span className="text-xs font-bold text-slate-300">latencia</span>
                     </div>
                  </div>
               </div>
            </div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               {/* Latency Section */}
               <div className="lg:col-span-2 space-y-8">
                  <LatencyChart data={chartData} />

                  {/* Event Log */}
                  <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                     <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-sm flex items-center gap-3">
                           <Clock className="w-5 h-5 text-slate-300" /> Registros de Eventos
                        </h4>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{logs.length} entradas</span>
                     </div>
                     <div className="max-h-[500px] overflow-y-auto overflow-x-hidden">
                        {logs.map((log, i) => (
                           <div key={log.id} className="grid grid-cols-1 md:grid-cols-[140px_1fr_120px] items-center gap-6 p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 transition-colors last:border-b-0">
                              <div className="flex items-center gap-3 text-slate-400 group">
                                 <div className="w-1.5 h-6 rounded-full bg-slate-200 dark:bg-slate-700 group-hover:bg-indigo-400 transition-colors" />
                                 <span className="font-mono font-bold text-xs">{new Date(log.ts).toLocaleString()}</span>
                              </div>
                              <div>
                                 <p className="text-sm font-black text-slate-800 dark:text-slate-200">{log.diag_title}</p>
                                 <p className="text-xs text-slate-500 mt-1">{log.diag_body}</p>
                              </div>
                              <div className="flex flex-col items-end gap-1.5">
                                 <div className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${log.diag_level === 'ok' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                    {log.diag_level}
                                 </div>
                                 <span className="text-[10px] font-mono font-bold text-slate-400">{log.domain_ms}ms latency</span>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>

               {/* Diagnostics Sidebar */}
               <div className="space-y-6">
                  <div className={`rounded-[40px] p-8 border ${logs[0]?.diag_level === 'ok' ? 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/50' : 'bg-amber-50/50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/50'} backdrop-blur-sm`}>
                     <div className="flex items-center gap-3 mb-6">
                        {logs[0]?.diag_level === 'ok' ? (
                           <CheckCircle className="w-8 h-8 text-emerald-500" />
                        ) : (
                           <AlertCircle className="w-8 h-8 text-amber-500" />
                        )}
                        <h5 className={`font-black uppercase tracking-widest text-sm ${logs[0]?.diag_level === 'ok' ? 'text-emerald-700' : 'text-amber-700'}`}>Check Actual</h5>
                     </div>
                     <div className="space-y-5">
                        <div>
                           <p className={`font-black text-lg ${logs[0]?.diag_level === 'ok' ? 'text-emerald-900' : 'text-amber-900'}`}>{logs[0]?.diag_title ?? 'Sin datos'}</p>
                           <p className={`text-sm mt-1 opacity-70 ${logs[0]?.diag_level === 'ok' ? 'text-emerald-800' : 'text-amber-800'}`}>{logs[0]?.diag_body ?? '--'}</p>
                        </div>

                        <div className="pt-6 border-t border-black/5 flex flex-col gap-3">
                           <div className="flex justify-between items-center bg-white/40 dark:bg-black/20 p-3 rounded-2xl">
                              <span className="text-[10px] font-black uppercase text-slate-500">Estado de IP</span>
                              <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${logs[0]?.ip_ok ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                 {logs[0]?.ip_ok ? 'LIVE' : 'DOWN'}
                              </span>
                           </div>
                           <div className="flex justify-between items-center bg-white/40 dark:bg-black/20 p-3 rounded-2xl">
                              <span className="text-[10px] font-black uppercase text-slate-500">Estado de Dominio</span>
                              <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${logs[0]?.domain_ok ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                 {logs[0]?.domain_ok ? 'LIVE' : 'DOWN'}
                              </span>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="bg-indigo-600 rounded-[40px] p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-200 dark:shadow-none">
                     <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                     <h5 className="font-black uppercase tracking-widest text-xs opacity-70 mb-6 flex items-center gap-2">
                        <Bell className="w-4 h-4" /> Canal de Alertas
                     </h5>
                     <p className="font-bold text-lg mb-2">n8n Workflow Integrado</p>
                     <p className="text-xs opacity-80 leading-relaxed mb-6">
                        Las alertas críticas y notificaciones de recuperación se envían automáticamente al endpoint configurado en n8n.
                     </p>
                     <div className="bg-white/10 rounded-2xl p-4 border border-white/5 space-y-3">
                        <div className="flex flex-col gap-1">
                           <span className="text-[10px] font-black opacity-60 uppercase tracking-widest">WebHook</span>
                           <span className="text-xs font-mono font-bold truncate">.../webhook/send-email</span>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

         </div>
      </div>
   );
}
