"use client"

const STAGE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  prospect:         { label: "Prospect",         icon: "○", color: "#94a3b8" },
  lead_qualificado: { label: "Lead Qualificado",  icon: "◆", color: "#60a5fa" },
  oportunidade:     { label: "Oportunidade",      icon: "◎", color: "#fbbf24" },
  cliente:          { label: "Cliente",           icon: "★", color: "#22c55e" },
  pos_venda:        { label: "Pós-venda",         icon: "◈", color: "#a78bfa" },
  churned:          { label: "Inativo",           icon: "✕", color: "#f87171" },
}

interface LifecycleBadgeProps {
  stage?: string | null
  className?: string
}

export function LifecycleBadge({ stage, className = "" }: LifecycleBadgeProps) {
  const config = STAGE_CONFIG[stage ?? "prospect"] ?? STAGE_CONFIG.prospect
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}
      style={{
        backgroundColor: `${config.color}20`,
        borderColor: `${config.color}50`,
        color: config.color,
      }}
    >
      <span className="text-[10px] leading-none">{config.icon}</span>
      {config.label}
    </span>
  )
}
