"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Trash2 } from "lucide-react"

interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "danger" | "default"
}

export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean
    options: ConfirmOptions
    resolve: ((v: boolean) => void) | null
  }>({ open: false, options: { title: "" }, resolve: null })

  const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ open: true, options, resolve })
    })
  }, [])

  const handleConfirm = () => {
    state.resolve?.(true)
    setState((s) => ({ ...s, open: false, resolve: null }))
  }

  const handleCancel = () => {
    state.resolve?.(false)
    setState((s) => ({ ...s, open: false, resolve: null }))
  }

  const isDanger = state.options.variant === "danger"

  const ConfirmDialogElement = state.open ? (
    <>
      <div className="fixed inset-0 z-[300] bg-black/50" onClick={handleCancel} />
      <div className="fixed z-[310] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-xl shadow-2xl p-6 w-80">
        <div className="flex items-start gap-3 mb-4">
          <div className={`mt-0.5 flex-shrink-0 rounded-full p-1.5 ${isDanger ? "bg-destructive/15" : "bg-muted"}`}>
            {isDanger
              ? <Trash2 className="h-4 w-4 text-destructive" />
              : <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            }
          </div>
          <div>
            <p className="font-semibold text-sm">{state.options.title}</p>
            {state.options.description && (
              <p className="text-xs text-muted-foreground mt-1">{state.options.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={handleCancel}>
            {state.options.cancelLabel ?? "Cancelar"}
          </Button>
          <Button
            size="sm"
            variant={isDanger ? "destructive" : "default"}
            onClick={handleConfirm}
          >
            {state.options.confirmLabel ?? "Confirmar"}
          </Button>
        </div>
      </div>
    </>
  ) : null

  return { showConfirm, ConfirmDialogElement }
}
