"use client";
import { Activity, Globe, Shield, Zap } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Props = {
  target: {
    id: number;
    name: string;
    ip: string;
    domain: string;
    notification_email: string;
    active: boolean;
  };
  latest: {
    ts: string;
    ip: { ok: boolean; status: any; ms: number | null };
    domain: { ok: boolean; status: any; ms: number | null };
    diag: { level: "ok" | "warn" | "crit"; title: string; body: string };
  } | null;
  onClick: () => void;
};

const STYLES = {
  ok: {
    bg: "bg-emerald-50/50 dark:bg-emerald-950/20",
    border: "border-emerald-100 dark:border-emerald-800",
    dot: "bg-emerald-500 shadow-emerald-200 shadow-lg",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  warn: {
    bg: "bg-amber-50/50 dark:bg-amber-950/20",
    border: "border-amber-100 dark:border-amber-800",
    dot: "bg-amber-500 shadow-amber-200 shadow-lg",
    text: "text-amber-700 dark:text-amber-400",
  },
  crit: {
    bg: "bg-rose-50/50 dark:bg-rose-950/20",
    border: "border-rose-100 dark:border-rose-800",
    dot: "bg-rose-500 shadow-rose-200 shadow-lg animate-pulse",
    text: "text-rose-700 dark:text-rose-400",
  },
  idle: {
    bg: "bg-slate-50 dark:bg-slate-900/50",
    border: "border-slate-100 dark:border-slate-800",
    dot: "bg-slate-300 dark:bg-slate-700",
    text: "text-slate-500",
  },
};

export default function TargetCard({ target, latest, onClick }: Props) {
  const level = latest?.diag?.level ?? "idle";
  const s = STYLES[level];

  return (
    <div
      onClick={onClick}
      className={cn(
        "group cursor-pointer p-6 rounded-3xl border transition-all duration-300 relative overflow-hidden",
        "hover:shadow-xl hover:scale-[1.02] active:scale-[0.99]",
        s.bg,
        s.border
      )}
    >
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center">
            <Activity className={cn("w-6 h-6", s.text)} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white leading-tight">
              {target.name}
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">#{target.id}</p>
          </div>
        </div>
        <div className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", s.text, "bg-white dark:bg-slate-900 shadow-sm")}>
           {level}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl p-3 border border-slate-100 dark:border-slate-800">
           <div className="flex items-center gap-2 mb-1.5">
              <Shield className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wide">Servidor IP</span>
           </div>
           <p className="text-sm font-mono font-medium text-slate-800 dark:text-slate-200 truncate">{target.ip}</p>
           <p className="text-[10px] mt-1 font-medium">{latest?.ip?.ok ? "🟢 En línea" : "🔴 Fuera de línea"}</p>
        </div>
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl p-3 border border-slate-100 dark:border-slate-800">
           <div className="flex items-center gap-2 mb-1.5">
              <Globe className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wide">Dominio</span>
           </div>
           <p className="text-sm font-mono font-medium text-slate-800 dark:text-slate-200 truncate">{target.domain}</p>
           <p className="text-[10px] mt-1 font-medium">{latest?.domain?.ok ? "🟢 En línea" : "🔴 Fuera de línea"}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-200/50 dark:border-slate-800">
         <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
              {latest?.domain?.ms ? `${latest.domain.ms}ms` : '—'}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">latencia</span>
         </div>
         <div className="flex items-center gap-2">
            <span className={cn("w-2 h-2 rounded-full", s.dot)} />
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{latest ? 'Vivo' : 'Esperando'}</span>
         </div>
      </div>
    </div>
  );
}
