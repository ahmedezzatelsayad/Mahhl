"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"
import { useLangStore } from "@/lib/stores/lang-store"

/**
 * Global feedback layer for the whole store + admin.
 * - mounted once in app/layout.tsx (EVERY toast call app-wide flows through here)
 * - dir follows site language (AR=rtl / EN=ltr) so toasts read naturally
 * - top-center keeps clear of the mobile sticky ATC bar and the
 *   floating WhatsApp/AI buttons that live at the bottom of the viewport
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  const lang = useLangStore((s) => s.lang)

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      dir={lang === "en" ? "ltr" : "rtl"}
      position="top-center"
      richColors
      closeButton
      visibleToasts={3}
      offset={16}
      className="toaster group"
      toastOptions={{
        duration: 3200,
        style: {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          fontFamily: "var(--font-body)",
        } as React.CSSProperties,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
