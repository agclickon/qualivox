"use client"

const STAGE_CONFIG: Record<string, { label: string; className: string }> = {
  prospect:        { label: "Prospect",        className: "bg-slate-100 text-slate-600 border-slate-200" },
  lead_qualificado:{ label: "Lead Qualificado",className: "bg-blue-100 text-blue-700 border-blue-200" },
  oportunidade:    { label: "Oportunidade",    className: "bg-amber-100 text-amber-700 border-amber-200" },
  cliente:         { label: "Cliente",          className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  pos_venda:       { label: "Pós-venda",        className: "bg-purple-100 text-purple-700 border-purple-200" },
  churned:         { label: "Inativo",          className: "bg-red-100 text-red-600 border-red-200" },
}

interface LifecycleBadgeProps {
  stage?: string | null
  className?: string
}

export function LifecycleBadge({ stage, className = "" }: LifecycleBadgeProps) {
  const config = STAGE_CONFIG[stage ?? "prospect"] ?? STAGE_CONFIG.prospect
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${config.className} ${className}`}
    >
      {stage === "cliente" && <span className="mr-1">⭐</span>}
      {config.label}
    </span>
  )
}
