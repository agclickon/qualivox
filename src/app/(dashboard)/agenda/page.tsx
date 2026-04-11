"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useConfirm } from "@/hooks/use-confirm"
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, Loader2,
  Video, ExternalLink, Trash2, Bot, User, Clock, X,
  CalendarCheck, CalendarX, List, LayoutGrid, Calendar,
  Pencil, UserPlus, Check,
} from "lucide-react"

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface CalEvent {
  id: string
  google_event_id: string | null
  calendar_id?: string
  title: string
  start_time: string
  end_time: string
  meet_link: string | null
  attendee_name: string | null
  attendee_email: string | null
  status: string
  created_by: string
  lead_id: string | null
  conversation_id: string | null
}

interface GoogleCal {
  id: string
  name: string
  color: string
  primary: boolean
}

interface Attendee { name: string; email: string }

type ViewMode = "month" | "week" | "list"

// ── Helpers ────────────────────────────────────────────────────────────────────

const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}
function fmtFull(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}
function isoDay(date: Date) {
  return date.toISOString().slice(0, 10)
}
function startOfWeek(date: Date) {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}
function buildMonthDays(year: number, month: number) {
  const first = new Date(year, month, 1)
  const startDay = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days: { date: Date; iso: string; label: number; isCurrentMonth: boolean }[] = []
  for (let i = 0; i < startDay; i++) {
    const d = new Date(year, month, 1 - (startDay - i))
    days.push({ date: d, iso: isoDay(d), label: d.getDate(), isCurrentMonth: false })
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i)
    days.push({ date: d, iso: isoDay(d), label: i, isCurrentMonth: true })
  }
  while (days.length % 7 !== 0) {
    const last = days[days.length - 1].date
    const d = new Date(last); d.setDate(d.getDate() + 1)
    days.push({ date: d, iso: isoDay(d), label: d.getDate(), isCurrentMonth: false })
  }
  return days
}

// ── Custom DatePicker ──────────────────────────────────────────────────────────

function DatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [navDate, setNavDate] = useState(() => value ? new Date(value + "T12:00:00") : new Date())
  const ref = useRef<HTMLDivElement>(null)
  const todayIso = isoDay(new Date())

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const days = useMemo(() => buildMonthDays(navDate.getFullYear(), navDate.getMonth()), [navDate])
  const label = value
    ? new Date(value + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "Selecionar data"

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm hover:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary transition-colors text-left">
        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <span className={value ? "text-foreground" : "text-muted-foreground"}>{label}</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 rounded-xl border border-border bg-card shadow-2xl p-3 w-64">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => setNavDate((d) => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n })}
              className="p-1 rounded-full hover:bg-muted/40 transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold capitalize">
              {MONTHS_PT[navDate.getMonth()]} {navDate.getFullYear()}
            </span>
            <button type="button" onClick={() => setNavDate((d) => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n })}
              className="p-1 rounded-full hover:bg-muted/40 transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {WEEK_DAYS.map((d) => (
              <span key={d} className="text-center text-[11px] font-semibold text-muted-foreground uppercase py-1">{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {days.map(({ iso, label: lbl, isCurrentMonth }) => {
              const isSelected = iso === value
              const isToday = iso === todayIso
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => { onChange(iso); setOpen(false) }}
                  className={`h-8 rounded-full text-sm transition-all
                    ${isSelected ? "bg-primary text-primary-foreground shadow font-semibold"
                      : isToday ? "border border-primary/50 text-primary font-medium"
                      : "text-foreground hover:bg-muted/60"}
                    ${!isCurrentMonth ? "opacity-30" : ""}`}>
                  {lbl}
                </button>
              )
            })}
          </div>
          <div className="flex justify-between mt-2 pt-2 border-t border-border">
            <button type="button" onClick={() => { onChange(""); setOpen(false) }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors">Limpar</button>
            <button type="button" onClick={() => { onChange(todayIso); setOpen(false) }}
              className="text-xs text-primary font-medium hover:text-primary/80 transition-colors">Hoje</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Custom TimePicker ──────────────────────────────────────────────────────────

function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [h, m] = value.split(":").map(Number)
  const hourRef = useRef<HTMLDivElement>(null)
  const minRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        hourRef.current?.children[h]?.scrollIntoView({ block: "center" })
        minRef.current?.children[Math.floor(m / 5)]?.scrollIntoView({ block: "center" })
      }, 50)
    }
  }, [open])

  const setHour = (hr: number) => onChange(`${String(hr).padStart(2, "0")}:${String(m).padStart(2, "0")}`)
  const setMin = (mn: number) => onChange(`${String(h).padStart(2, "0")}:${String(mn).padStart(2, "0")}`)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm hover:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary transition-colors text-left">
        <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <span className="text-foreground">{value}</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 rounded-xl border border-border bg-card shadow-2xl overflow-hidden w-36">
          <div className="flex">
            {/* Hours */}
            <div ref={hourRef} className="flex-1 h-48 overflow-y-auto scrollbar-thin py-2 border-r border-border">
              {Array.from({ length: 24 }, (_, i) => (
                <button
                  key={i} type="button"
                  onClick={() => setHour(i)}
                  className={`w-full py-1.5 text-sm text-center transition-colors hover:bg-muted
                    ${i === h ? "bg-primary text-primary-foreground font-semibold" : "text-foreground"}`}>
                  {String(i).padStart(2, "0")}
                </button>
              ))}
            </div>
            {/* Minutes (steps of 5) */}
            <div ref={minRef} className="flex-1 h-48 overflow-y-auto scrollbar-thin py-2">
              {[0,5,10,15,20,25,30,35,40,45,50,55].map((mn) => (
                <button
                  key={mn} type="button"
                  onClick={() => { setMin(mn); setOpen(false) }}
                  className={`w-full py-1.5 text-sm text-center transition-colors hover:bg-muted
                    ${mn === m ? "bg-primary text-primary-foreground font-semibold" : "text-foreground"}`}>
                  {String(mn).padStart(2, "0")}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Modal de Criar/Editar Evento ───────────────────────────────────────────────

interface EventModalProps {
  mode: "create" | "edit"
  editEvent?: CalEvent
  initialDate?: string
  initialCalendarId?: string
  calendars?: GoogleCal[]
  onClose: () => void
  onSaved: () => void
}

function EventModal({ mode, editEvent, initialDate, initialCalendarId, calendars = [], onClose, onSaved }: EventModalProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [calendarId, setCalendarId] = useState<string>(() => {
    if (editEvent?.calendar_id) return editEvent.calendar_id
    if (initialCalendarId) return initialCalendarId
    return calendars.find((c) => c.primary)?.id ?? "primary"
  })

  const parseIsoToDateHour = (iso: string) => {
    const d = new Date(iso)
    const date = isoDay(d)
    const hh = String(d.getHours()).padStart(2, "0")
    const mm = String(Math.round(d.getMinutes() / 5) * 5 % 60).padStart(2, "0")
    return { date, time: `${hh}:${mm}` }
  }
  const getDurationMins = (start: string, end: string) =>
    Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)

  const [title, setTitle] = useState(editEvent?.title ?? "")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(() => {
    if (editEvent) return parseIsoToDateHour(editEvent.start_time).date
    return initialDate ?? isoDay(new Date())
  })
  const [startTime, setStartTime] = useState(() => {
    if (editEvent) return parseIsoToDateHour(editEvent.start_time).time
    return "09:00"
  })
  const [duration, setDuration] = useState(() => {
    if (editEvent) {
      const d = getDurationMins(editEvent.start_time, editEvent.end_time)
      return String(d)
    }
    return "60"
  })
  const [addMeetLink, setAddMeetLink] = useState(true)
  const [attendees, setAttendees] = useState<Attendee[]>(() => {
    if (editEvent?.attendee_name || editEvent?.attendee_email) {
      return [{ name: editEvent.attendee_name ?? "", email: editEvent.attendee_email ?? "" }]
    }
    return [{ name: "", email: "" }]
  })
  const [newAttName, setNewAttName] = useState("")
  const [newAttEmail, setNewAttEmail] = useState("")

  const addAttendee = () => {
    if (!newAttEmail.trim()) return
    setAttendees((p) => [...p, { name: newAttName.trim(), email: newAttEmail.trim() }])
    setNewAttName(""); setNewAttEmail("")
  }
  const removeAttendee = (i: number) => setAttendees((p) => p.filter((_, idx) => idx !== i))
  const updateAttendee = (i: number, field: "name" | "email", val: string) =>
    setAttendees((p) => p.map((a, idx) => idx === i ? { ...a, [field]: val } : a))

  const handleSave = async () => {
    if (!title.trim()) { toast({ variant: "destructive", title: "Título é obrigatório" }); return }
    if (!date) { toast({ variant: "destructive", title: "Selecione uma data" }); return }
    setSaving(true)
    try {
      const startDt = new Date(`${date}T${startTime}:00`)
      const endDt = new Date(startDt.getTime() + Number(duration) * 60000)
      const validAttendees = attendees.filter((a) => a.email.trim())
      const firstAtt = validAttendees[0]

      if (mode === "create") {
        const res = await fetch("/api/integrations/calendar/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description || undefined,
            startTime: startDt.toISOString(),
            endTime: endDt.toISOString(),
            attendeeEmail: firstAtt?.email || undefined,
            attendeeName: firstAtt?.name || undefined,
            addMeetLink,
            calendarId: calendarId !== "primary" ? calendarId : undefined,
          }),
        })
        const data = await res.json()
        if (data.success) { toast({ title: "Evento criado!" }); onSaved(); onClose() }
        else toast({ variant: "destructive", title: data.error ?? "Erro ao criar evento" })
      } else if (editEvent) {
        const res = await fetch("/api/integrations/calendar/events", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            googleEventId: editEvent.google_event_id,
            title: title.trim(),
            description: description || undefined,
            startTime: startDt.toISOString(),
            endTime: endDt.toISOString(),
            attendeeEmail: firstAtt?.email || undefined,
            attendeeName: firstAtt?.name || undefined,
          }),
        })
        const data = await res.json()
        if (data.success) { toast({ title: "Evento atualizado!" }); onSaved(); onClose() }
        else toast({ variant: "destructive", title: data.error ?? "Erro ao editar evento" })
      }
    } catch {
      toast({ variant: "destructive", title: "Erro ao salvar evento" })
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">{mode === "create" ? "Novo Evento" : "Editar Evento"}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Título */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Título *</label>
            <input
              autoFocus
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Ex: Reunião com João Silva"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Data e Horário */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Data</label>
              <DatePicker value={date} onChange={setDate} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Horário</label>
              <TimePicker value={startTime} onChange={setStartTime} />
            </div>
          </div>

          {/* Duração */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Duração</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[["15","15 min"],["30","30 min"],["45","45 min"],["60","1h"],["90","1h 30"],["120","2h"]].map(([v, l]) => (
                <button
                  key={v} type="button"
                  onClick={() => setDuration(v)}
                  className={`rounded-lg border py-1.5 text-xs font-medium transition-colors
                    ${duration === v ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Convidados */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Convidados</label>
            {attendees.map((att, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-background/50 px-3 py-2">
                <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 grid grid-cols-2 gap-2 min-w-0">
                  <input
                    className="bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/60 min-w-0"
                    placeholder="Nome"
                    value={att.name}
                    onChange={(e) => updateAttendee(i, "name", e.target.value)}
                  />
                  <input
                    className="bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/60 min-w-0"
                    placeholder="email@exemplo.com"
                    value={att.email}
                    onChange={(e) => updateAttendee(i, "email", e.target.value)}
                  />
                </div>
                <button type="button" onClick={() => removeAttendee(i)}
                  className="text-muted-foreground hover:text-rose-400 transition-colors flex-shrink-0">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {/* Adicionar convidado */}
            <div className="flex items-center gap-2">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <input
                  className="rounded-md border border-dashed border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:border-primary placeholder:text-muted-foreground/60"
                  placeholder="Nome"
                  value={newAttName}
                  onChange={(e) => setNewAttName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addAttendee()}
                />
                <input
                  className="rounded-md border border-dashed border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:border-primary placeholder:text-muted-foreground/60"
                  placeholder="E-mail"
                  value={newAttEmail}
                  onChange={(e) => setNewAttEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addAttendee()}
                />
              </div>
              <button type="button" onClick={addAttendee}
                disabled={!newAttEmail.trim()}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0">
                <UserPlus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Descrição (opcional)</label>
            <textarea
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              placeholder="Pauta da reunião..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Calendário de destino */}
          {mode === "create" && calendars.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Adicionar em</label>
              <div className="flex flex-col gap-1">
                {calendars.map((cal) => (
                  <button
                    key={cal.id}
                    type="button"
                    onClick={() => setCalendarId(cal.id)}
                    className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm text-left transition-colors
                      ${calendarId === cal.id ? "border-primary/40 bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}>
                    <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cal.color }} />
                    <span className="flex-1 truncate">{cal.name}</span>
                    {calendarId === cal.id && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Google Meet toggle */}
          {mode === "create" && (
            <button
              type="button"
              onClick={() => setAddMeetLink((v) => !v)}
              className={`flex w-full items-center justify-between rounded-lg border px-4 py-2.5 transition-colors
                ${addMeetLink ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/30"}`}>
              <div className="flex items-center gap-2">
                <Video className={`h-4 w-4 ${addMeetLink ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-sm">Adicionar link do Google Meet</span>
              </div>
              <div className={`h-5 w-9 rounded-full transition-colors relative ${addMeetLink ? "bg-primary" : "bg-muted"}`}>
                <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${addMeetLink ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end border-t px-5 py-4 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : mode === "create" ? <Plus className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
            {mode === "create" ? "Criar Evento" : "Salvar Alterações"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Painel de detalhe do evento ────────────────────────────────────────────────

function EventDetailPanel({
  event, onClose, onDelete, onEdit,
}: {
  event: CalEvent
  onClose: () => void
  onDelete: (id: string, gId: string | null) => void
  onEdit: (event: CalEvent) => void
}) {
  const isPast = new Date(event.end_time) < new Date()
  const isCancelled = event.status === "cancelled"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b px-5 py-4">
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <div className={`mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0 ${isCancelled ? "bg-zinc-500" : isPast ? "bg-zinc-400" : "bg-emerald-400"}`} />
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-sm leading-snug">{event.title}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isCancelled ? "Cancelado" : isPast ? "Concluído" : "Confirmado"}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-muted ml-2 flex-shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          <div className="flex items-start gap-2.5">
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm">{fmtFull(event.start_time)}</p>
              <p className="text-xs text-muted-foreground">até {fmtTime(event.end_time)}</p>
            </div>
          </div>

          {(event.attendee_name || event.attendee_email) && (
            <div className="flex items-start gap-2.5">
              <User className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                {event.attendee_name && <p className="text-sm">{event.attendee_name}</p>}
                {event.attendee_email && <p className="text-xs text-muted-foreground">{event.attendee_email}</p>}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2.5">
            {event.created_by === "agent"
              ? <Bot className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              : <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
            <p className="text-sm text-muted-foreground">
              Criado por {event.created_by === "agent" ? "Agente IA" : "usuário"}
            </p>
          </div>

          {event.meet_link && (
            <a href={event.meet_link} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2.5 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 hover:bg-primary/10 transition-colors">
              <Video className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-sm text-primary font-medium">Entrar no Google Meet</span>
              <ExternalLink className="h-3.5 w-3.5 text-primary ml-auto" />
            </a>
          )}

          {event.google_event_id && (
            <a href={`https://calendar.google.com/calendar/r`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ExternalLink className="h-3 w-3" />
              Ver no Google Calendar
            </a>
          )}
        </div>

        {/* Actions */}
        {!isCancelled && (
          <div className="border-t px-5 py-3 flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => onEdit(event)}>
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </Button>
            <Button variant="outline" size="sm"
              className="flex-1 gap-1.5 text-rose-400 border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300"
              onClick={() => onDelete(event.id, event.google_event_id)}>
              <Trash2 className="h-3.5 w-3.5" />
              Cancelar
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Página Principal ───────────────────────────────────────────────────────────

export default function AgendaPage() {
  const { toast } = useToast()
  const { showConfirm, ConfirmDialogElement } = useConfirm()

  const [events, setEvents] = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>("month")
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null)
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null)
  const [editingEvent, setEditingEvent] = useState<CalEvent | undefined>()
  const [newEventDate, setNewEventDate] = useState<string | undefined>()
  const [filterStatus, setFilterStatus] = useState<"all" | "confirmed" | "cancelled">("all")

  // Calendários do Google Calendar
  const [calendars, setCalendars] = useState<GoogleCal[]>([])
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<Set<string>>(new Set())
  const [calendarsExpanded, setCalendarsExpanded] = useState(true)

  // Carrega lista de calendários uma vez
  useEffect(() => {
    fetch("/api/integrations/calendar/calendars")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const cals: GoogleCal[] = data.data.calendars ?? []
          setCalendars(cals)
          // Por padrão, todos selecionados
          setSelectedCalendarIds(new Set(cals.map((c) => c.id)))
        }
      })
      .catch(() => {})
  }, [])

  const toggleCalendar = (id: string) => {
    setSelectedCalendarIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { if (next.size > 1) next.delete(id) } // mínimo 1
      else next.add(id)
      return next
    })
  }

  const loadEvents = useCallback(async (date?: Date) => {
    setLoading(true)
    try {
      const ref = date ?? currentDate
      const timeMin = new Date(ref.getFullYear(), ref.getMonth() - 1, 1).toISOString()
      const timeMax = new Date(ref.getFullYear(), ref.getMonth() + 2, 1).toISOString()
      const params = new URLSearchParams({ timeMin, timeMax })
      // Passa calendários selecionados se não forem todos (otimização)
      if (selectedCalendarIds.size > 0 && selectedCalendarIds.size < calendars.length) {
        params.set("calendarIds", Array.from(selectedCalendarIds).join(","))
      }
      const res = await fetch(`/api/integrations/calendar/events?${params}`)
      const data = await res.json()
      if (data.success) setEvents(data.data.events ?? [])
    } catch { toast({ variant: "destructive", title: "Erro ao carregar eventos" }) }
    finally { setLoading(false) }
  }, [currentDate, selectedCalendarIds, calendars.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Recarrega quando mês ou calendários selecionados mudam
  useEffect(() => { loadEvents(currentDate) }, [currentDate, selectedCalendarIds]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (localId: string, googleEventId: string | null) => {
    if (!await showConfirm({ title: "Cancelar evento?", description: "O evento será cancelado no Google Calendar.", variant: "danger", confirmLabel: "Cancelar evento" })) return
    try {
      if (googleEventId) {
        await fetch(`/api/integrations/calendar/events?googleEventId=${googleEventId}`, { method: "DELETE" })
      }
      setSelectedEvent(null)
      toast({ title: "Evento cancelado" })
      // Recarrega do Google Calendar para refletir o estado real
      await loadEvents(currentDate)
    } catch { toast({ variant: "destructive", title: "Erro ao cancelar evento" }) }
  }

  const openEdit = (event: CalEvent) => {
    setSelectedEvent(null)
    setEditingEvent(event)
    setModalMode("edit")
  }

  const openCreate = (date?: string) => {
    setNewEventDate(date)
    setEditingEvent(undefined)
    setModalMode("create")
  }

  const filtered = useMemo(() => events.filter((e) => {
    if (filterStatus === "confirmed") return e.status !== "cancelled"
    if (filterStatus === "cancelled") return e.status === "cancelled"
    return true
  }), [events, filterStatus])

  const todayStr = isoDay(new Date())

  const eventsToday = filtered.filter((e) => isoDay(new Date(e.start_time)) === todayStr && e.status !== "cancelled")
  const eventsThisWeek = useMemo(() => {
    const start = startOfWeek(new Date()); const end = new Date(start); end.setDate(end.getDate() + 7)
    return filtered.filter((e) => { const d = new Date(e.start_time); return d >= start && d < end && e.status !== "cancelled" })
  }, [filtered])
  const eventsThisMonth = useMemo(() => {
    const now = new Date()
    return filtered.filter((e) => { const d = new Date(e.start_time); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && e.status !== "cancelled" })
  }, [filtered])
  const nextEvent = useMemo(() => {
    const now = new Date()
    return filtered.filter((e) => new Date(e.start_time) > now && e.status !== "cancelled")
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0] ?? null
  }, [filtered])

  const monthDays = useMemo(() => buildMonthDays(currentDate.getFullYear(), currentDate.getMonth()), [currentDate])

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalEvent[]> = {}
    for (const e of filtered) { const day = isoDay(new Date(e.start_time)); if (!map[day]) map[day] = []; map[day].push(e) }
    return map
  }, [filtered])

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate)
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return { date: d, iso: isoDay(d) } })
  }, [currentDate])

  const navigate = (dir: 1 | -1) => {
    setCurrentDate((prev) => {
      const d = new Date(prev)
      if (view === "week") d.setDate(d.getDate() + dir * 7)
      else d.setMonth(d.getMonth() + dir)
      return d
    })
  }

  const periodLabel = useMemo(() => {
    if (view === "week") {
      const s = weekDays[0].date; const e = weekDays[6].date
      return `${fmtDate(s.toISOString())} – ${fmtDate(e.toISOString())}`
    }
    return `${MONTHS_PT[currentDate.getMonth()]} ${currentDate.getFullYear()}`
  }, [view, currentDate, weekDays])

  const listEvents = useMemo(() => [...filtered]
    .filter((e) => { const d = new Date(e.start_time); return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear() })
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()),
    [filtered, currentDate])

  return (
    <div className="flex gap-5 p-6 items-start">
      {ConfirmDialogElement}

      {/* ── Sidebar de Calendários ── */}
      {calendars.length > 0 && (
        <div className="hidden lg:flex flex-col gap-2 w-52 flex-shrink-0 sticky top-6">
          <button
            type="button"
            onClick={() => openCreate()}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> Novo Evento
          </button>

          <div className="mt-2 rounded-xl border border-border bg-card overflow-hidden">
            <button
              type="button"
              onClick={() => setCalendarsExpanded((v) => !v)}
              className="flex items-center justify-between w-full px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:bg-muted/40 transition-colors">
              Minhas agendas
              <ChevronRight className={`h-3.5 w-3.5 transition-transform ${calendarsExpanded ? "rotate-90" : ""}`} />
            </button>
            {calendarsExpanded && (
              <div className="px-2 pb-2 space-y-0.5">
                {calendars.map((cal) => {
                  const active = selectedCalendarIds.has(cal.id)
                  return (
                    <button
                      key={cal.id}
                      type="button"
                      onClick={() => toggleCalendar(cal.id)}
                      className="flex items-center gap-2.5 w-full rounded-lg px-2 py-1.5 text-sm text-left hover:bg-muted/40 transition-colors group">
                      <span
                        className={`h-3.5 w-3.5 rounded-sm flex-shrink-0 transition-all flex items-center justify-center border-2`}
                        style={{ backgroundColor: active ? cal.color : "transparent", borderColor: cal.color }}>
                        {active && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                      </span>
                      <span className={`truncate ${active ? "text-foreground" : "text-muted-foreground"}`}>{cal.name}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-5 flex-1 min-w-0">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus compromissos e reuniões</p>
        </div>
        {/* Button on mobile (sidebar has it on desktop) */}
        <Button onClick={() => openCreate()} className={`gap-2 ${calendars.length > 0 ? "lg:hidden" : ""}`}>
          <Plus className="h-4 w-4" /> Novo Evento
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Hoje", value: eventsToday.length, icon: <CalendarDays className="h-4 w-4 text-primary" />, color: "text-primary" },
          { label: "Esta semana", value: eventsThisWeek.length, icon: <CalendarCheck className="h-4 w-4 text-emerald-400" />, color: "text-emerald-400" },
          { label: "Este mês", value: eventsThisMonth.length, icon: <Calendar className="h-4 w-4 text-sky-400" />, color: "text-sky-400" },
          { label: "Próximo", value: nextEvent ? fmtTime(nextEvent.start_time) : "—", sub: nextEvent ? fmtDate(nextEvent.start_time) : undefined, icon: <Clock className="h-4 w-4 text-amber-400" />, color: "text-amber-400" },
        ].map((kpi) => (
          <Card key={kpi.label} className="bg-card/60">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
                {kpi.icon}
              </div>
              <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
              {kpi.sub && <p className="text-[11px] text-muted-foreground">{kpi.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Calendar Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <button type="button" onClick={() => navigate(-1)} className="rounded-lg border p-1.5 hover:bg-muted transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h2 className="text-base font-semibold capitalize min-w-[220px] text-center">{periodLabel}</h2>
              <button type="button" onClick={() => navigate(1)} className="rounded-lg border p-1.5 hover:bg-muted transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setCurrentDate(new Date())}
                className="ml-1 rounded-lg border px-2.5 py-1 text-xs hover:bg-muted transition-colors">
                Hoje
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border overflow-hidden text-xs">
                {(["all","confirmed","cancelled"] as const).map((s) => (
                  <button key={s} type="button" onClick={() => setFilterStatus(s)}
                    className={`px-3 py-1.5 transition-colors ${filterStatus === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                    {s === "all" ? "Todos" : s === "confirmed" ? "Confirmados" : "Cancelados"}
                  </button>
                ))}
              </div>
              <div className="flex rounded-lg border overflow-hidden">
                {([{v:"month" as ViewMode,icon:<LayoutGrid className="h-3.5 w-3.5"/>},{v:"week" as ViewMode,icon:<CalendarDays className="h-3.5 w-3.5"/>},{v:"list" as ViewMode,icon:<List className="h-3.5 w-3.5"/>}]).map(({v,icon}) => (
                  <button key={v} type="button" onClick={() => setView(v)}
                    className={`px-2.5 py-1.5 transition-colors ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Month */}
              {view === "month" && (
                <div>
                  <div className="grid grid-cols-7 mb-1">
                    {WEEK_DAYS.map((d) => (
                      <div key={d} className="py-2 text-center text-[11px] font-semibold text-muted-foreground uppercase">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 border-l border-t">
                    {monthDays.map(({ date, iso, label, isCurrentMonth }) => {
                      const dayEvts = eventsByDay[iso] ?? []
                      const isToday = iso === todayStr
                      return (
                        <div key={iso} onClick={() => openCreate(iso)}
                          className={`min-h-[96px] border-b border-r p-1.5 cursor-pointer transition-colors hover:bg-muted/30 ${!isCurrentMonth ? "opacity-40" : ""}`}>
                          <div className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${isToday ? "bg-primary text-primary-foreground" : "text-foreground"}`}>
                            {label}
                          </div>
                          <div className="space-y-0.5">
                            {dayEvts.slice(0, 3).map((e) => (
                              <button key={e.id} type="button"
                                onClick={(ev) => { ev.stopPropagation(); setSelectedEvent(e) }}
                                className={`w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium transition-colors
                                  ${e.status === "cancelled" ? "bg-zinc-500/20 text-zinc-400 line-through"
                                    : new Date(e.end_time) < new Date() ? "bg-zinc-600/30 text-zinc-300"
                                    : "bg-primary/20 text-primary hover:bg-primary/30"}`}>
                                {fmtTime(e.start_time)} {e.title}
                              </button>
                            ))}
                            {dayEvts.length > 3 && <p className="text-[10px] text-muted-foreground px-1">+{dayEvts.length - 3} mais</p>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Week */}
              {view === "week" && (
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map(({ date, iso }) => {
                    const dayEvts = (eventsByDay[iso] ?? []).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                    const isToday = iso === todayStr
                    return (
                      <div key={iso} className="flex flex-col gap-1">
                        <div onClick={() => openCreate(iso)}
                          className={`rounded-lg border p-2 text-center cursor-pointer transition-colors hover:border-primary/40 ${isToday ? "border-primary/50 bg-primary/5" : "border-border"}`}>
                          <p className="text-[10px] text-muted-foreground uppercase">{date.toLocaleDateString("pt-BR", { weekday: "short" })}</p>
                          <p className={`text-lg font-bold leading-none mt-0.5 ${isToday ? "text-primary" : ""}`}>{date.getDate()}</p>
                        </div>
                        <div className="space-y-1 min-h-[160px]">
                          {dayEvts.map((e) => (
                            <button key={e.id} type="button" onClick={() => setSelectedEvent(e)}
                              className={`w-full text-left rounded-lg border px-2 py-1.5 transition-colors
                                ${e.status === "cancelled" ? "border-zinc-700 bg-zinc-800/40 opacity-50"
                                  : new Date(e.end_time) < new Date() ? "border-zinc-700 bg-zinc-800/60 hover:border-zinc-500"
                                  : "border-primary/30 bg-primary/10 hover:bg-primary/15"}`}>
                              <p className={`text-[11px] font-medium truncate ${e.status === "cancelled" ? "line-through text-zinc-400" : ""}`}>{e.title}</p>
                              <p className="text-[10px] text-muted-foreground">{fmtTime(e.start_time)}</p>
                              {e.meet_link && <Video className="h-2.5 w-2.5 text-primary mt-0.5" />}
                            </button>
                          ))}
                          {dayEvts.length === 0 && (
                            <div className="flex h-full min-h-[80px] items-center justify-center rounded-lg border border-dashed border-border">
                              <p className="text-[10px] text-muted-foreground">Livre</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* List */}
              {view === "list" && (
                listEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <CalendarX className="h-12 w-12 text-muted-foreground opacity-40" />
                    <p className="text-muted-foreground text-sm">Nenhum evento neste período</p>
                    <Button size="sm" variant="outline" onClick={() => openCreate()} className="gap-1.5">
                      <Plus className="h-3.5 w-3.5" /> Criar evento
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {listEvents.map((e) => {
                      const isPast = new Date(e.end_time) < new Date()
                      const isCancelled = e.status === "cancelled"
                      return (
                        <button key={e.id} type="button" onClick={() => setSelectedEvent(e)}
                          className={`w-full text-left flex items-center gap-4 rounded-xl border px-4 py-3 transition-colors hover:bg-muted/30
                            ${isCancelled ? "opacity-50 border-border" : isPast ? "border-border bg-muted/10" : "border-primary/20 bg-primary/5 hover:border-primary/30"}`}>
                          <div className="flex-shrink-0 text-center w-12">
                            <p className="text-[11px] text-muted-foreground uppercase">
                              {new Date(e.start_time).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
                            </p>
                            <p className={`text-2xl font-bold leading-none ${isCancelled || isPast ? "text-muted-foreground" : "text-primary"}`}>
                              {new Date(e.start_time).getDate()}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{fmtTime(e.start_time)}</p>
                          </div>
                          <div className={`w-0.5 self-stretch rounded-full ${isCancelled ? "bg-zinc-700" : isPast ? "bg-zinc-600" : "bg-primary/40"}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium text-sm truncate ${isCancelled ? "line-through text-muted-foreground" : ""}`}>{e.title}</p>
                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                              {e.attendee_name && <span className="flex items-center gap-1 text-xs text-muted-foreground"><User className="h-3 w-3" />{e.attendee_name}</span>}
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                {e.created_by === "agent" ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
                                {e.created_by === "agent" ? "Agente" : "Manual"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {e.meet_link && <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] text-primary font-medium"><Video className="h-2.5 w-2.5" />Meet</span>}
                            {isCancelled && <span className="rounded-full bg-zinc-700/50 px-2 py-0.5 text-[11px] text-zinc-400">Cancelado</span>}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {modalMode && (
        <EventModal
          mode={modalMode}
          editEvent={editingEvent}
          initialDate={newEventDate}
          calendars={calendars}
          onClose={() => setModalMode(null)}
          onSaved={loadEvents}
        />
      )}
      {selectedEvent && (
        <EventDetailPanel
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onDelete={handleDelete}
          onEdit={openEdit}
        />
      )}

      </div>{/* end main content flex-1 */}
    </div>
  )
}
