"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/api";
import TargetCard from "@/components/TargetCard";
import { Plus, Power, RefreshCw, LayoutDashboard, Settings, LogOut, ServerCrash, Bell, Info } from "lucide-react";
import { useRouter } from "next/navigation";

const API_STREAM = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') + '/stream';

export default function DashboardPage() {
  const [targets, setTargets] = useState<any[]>([]);
  const [latents, setLatents] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const router = useRouter();
  
  // Form state
  const [newName, setNewName] = useState("");
  const [newIp, setNewIp] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [newEmail, setNewEmail] = useState("soporte@thradex.com");
  const [newInterval, setNewInterval] = useState(60);

  const esRef = useRef<EventSource | null>(null);

  const fetchTargets = async () => {
    try {
      const { data } = await api.get('/targets');
      setTargets(data);
      
      // Populate initial latents from database state
      const initialLatents: Record<number, any> = {};
      data.forEach((t: any) => {
        if (t.latest_log) {
          initialLatents[t.id] = {
            id: t.id,
            ...t.latest_log
          };
        }
      });
      setLatents(prev => ({ ...prev, ...initialLatents }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const connectSSE = useCallback(() => {
    if (esRef.current) esRef.current.close();
    const es = new EventSource(API_STREAM);
    es.addEventListener("check", (e) => {
      const data = JSON.parse(e.data);
      setLatents(prev => ({ ...prev, [data.id]: data }));
    });
    esRef.current = es;
  }, []);

  useEffect(() => {
    fetchTargets();
    connectSSE();
    return () => esRef.current?.close();
  }, [connectSSE]);

  const handleAddTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/targets', {
        name: newName,
        ip: newIp,
        domain: newDomain,
        notification_email: newEmail,
        interval: newInterval
      });
      setShowAdd(false);
      fetchTargets();
      // Reset form
      setNewName(""); setNewIp(""); setNewDomain(""); setNewEmail("soporte@thradex.com"); setNewInterval(60);
    } catch (err) {
      alert("Error al añadir servidor");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  const activeCount = targets.filter(t => t.active).length;
  const issueCount = Object.values(latents).filter(l => l.diag.level !== 'ok').length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans selection:bg-indigo-100">
      
      {/* Sidebar */}
      <aside className="w-72 border-r border-slate-200 dark:border-slate-800 flex flex-col p-6 sticky top-0 h-screen bg-white dark:bg-slate-950">
         <div className="flex items-center gap-3 mb-10 px-2 text-indigo-600 dark:text-indigo-400">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
               <ServerCrash className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">InfraMonitor</span>
         </div>

         <nav className="flex-1 space-y-2">
            <button className="w-full flex items-center gap-3 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 rounded-2xl font-bold transition-all">
               <LayoutDashboard className="w-5 h-5" />
               <span>Panel de control</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-2xl font-bold transition-all">
               <RefreshCw className="w-5 h-5" />
               <span>Registros globales</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-2xl font-bold transition-all">
               <Settings className="w-5 h-5" />
               <span>Configuración</span>
            </button>
         </nav>

         <div className="mt-auto space-y-4">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-2xl font-bold transition-all">
               <LogOut className="w-5 h-5" />
               <span>Cerrar sesión</span>
            </button>
         </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 overflow-auto">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Servidores Monitoreados</h2>
            <p className="text-slate-500 mt-1.5 font-medium flex items-center gap-2">
              <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 px-2.5 py-0.5 rounded-full text-[10px] text-slate-400 border border-slate-200 dark:border-slate-800">
                <Power className="w-3 h-3" /> {activeCount} Activos
              </span>
              <span className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/30 px-2.5 py-0.5 rounded-full text-[10px] text-rose-600 border border-rose-100 dark:border-rose-900/50">
                <Bell className="w-3 h-3" /> {issueCount} Con Alertas
              </span>
            </p>
          </div>
          <button 
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3.5 rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none transition-all transform active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Nuevo Servidor
          </button>
        </header>

        {/* Info Banner */}
        <div className="bg-gradient-to-r from-slate-900/50 to-slate-800/50 backdrop-blur rounded-3xl p-6 mb-10 border border-slate-800 text-slate-300 dark:text-slate-400 flex gap-4 items-center">
           <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shadow-lg border border-white/5">
              <Info className="w-6 h-6 text-white" />
           </div>
           <div>
              <p className="font-bold text-white mb-0.5">Alertas enviadas a support@thradex.com</p>
              <p className="text-sm opacity-80">El monitoreo automático está activo. Toda alerta será notificada vía n8n y correo electrónico.</p>
           </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1,2,3].map(i => <div key={i} className="h-64 bg-slate-100 dark:bg-slate-900 rounded-3xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {targets.map(target => (
              <TargetCard 
                key={target.id}
                target={target}
                latest={latents[target.id]}
                onClick={() => router.push(`/dashboard/target/${target.id}`)}
              />
            ))}
            {targets.length === 0 && (
              <div className="col-span-full py-20 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-[40px] text-center">
                 <ServerCrash className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                 <p className="text-slate-500 font-bold text-lg">No hay servidores configurados</p>
                 <p className="text-slate-400 text-sm mt-1 mb-8">Comienza añadiendo tu primer servidor VPS para monitorear.</p>
                 <button 
                   onClick={() => setShowAdd(true)}
                   className="bg-slate-900 dark:bg-white text-white dark:text-black font-bold px-6 py-3 rounded-2xl"
                 >
                   Empieza ahora
                 </button>
              </div>
            )}
          </div>
        )}

        {/* Add Modal */}
        {showAdd && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[40px] p-10 shadow-2xl overflow-hidden relative">
               <div className="absolute top-0 right-0 p-8">
                  <button onClick={() => setShowAdd(false)} className="text-slate-300 hover:text-slate-500"><Power className="w-6 h-6 rotate-45" /></button>
               </div>
               <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Añadir Monitoreo</h3>
               <p className="text-slate-500 text-sm mb-8">Configura un nuevo servidor para vigilancia activa.</p>
               <form onSubmit={handleAddTarget} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Alias / Nombre</label>
                       <input 
                         required className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none ring-1 ring-slate-200/50 dark:ring-slate-800 outline-none focus:ring-indigo-500"
                         placeholder="Producción DB-01" value={newName} onChange={e => setNewName(e.target.value)}
                       />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">IP del VPS</label>
                       <input 
                         required className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none ring-1 ring-slate-200/50 dark:ring-slate-800 outline-none focus:ring-indigo-500"
                         placeholder="192.168.1.1" value={newIp} onChange={e => setNewIp(e.target.value)}
                       />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Dominio (URL)</label>
                     <input 
                       required className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none ring-1 ring-slate-200/50 dark:ring-slate-800 outline-none focus:ring-indigo-500"
                       placeholder="https://app.mi-empresa.com" value={newDomain} onChange={e => setNewDomain(e.target.value)}
                     />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Correo de Notificación</label>
                     <input 
                       required className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none ring-1 ring-slate-200/50 dark:ring-slate-800 outline-none focus:ring-indigo-500"
                       placeholder="soporte@thradex.com" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                     />
                  </div>
                  <div className="pt-6">
                    <button type="submit" className="w-full bg-slate-900 dark:bg-indigo-600 text-white font-bold py-5 rounded-3xl shadow-xl transition-all hover:scale-[1.01] active:scale-95">
                       Configurar e Iniciar Monitoreo
                    </button>
                  </div>
               </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
