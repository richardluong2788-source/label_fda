"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, FileWarning, Ship, ShieldAlert } from "lucide-react"
import Link from "next/link"
import { FDAWarningLettersPipeline } from "@/components/fda-warning-letters-pipeline"
import { FDARecallsPipeline } from "@/components/fda-recalls-pipeline"
import { FDAImportAlertsPipeline } from "@/components/fda-import-alerts-pipeline"

type PipelineTab = "warning-letters" | "recalls" | "import-alerts"

export function FDAPipelineClient() {
  const [activeTab, setActiveTab] = useState<PipelineTab>("warning-letters")

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      {/* Back nav */}
      <div className="flex items-center gap-4">
        <Link href="/admin/knowledge">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Knowledge Base
          </Button>
        </Link>
      </div>

      {/* Page title */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          FDA Data Pipeline
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Automated fetching, review, and import of FDA enforcement data into the knowledge base
        </p>
      </div>

      {/* Pipeline tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab("warning-letters")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "warning-letters"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
          }`}
        >
          <FileWarning className="h-4 w-4" />
          Warning Letters
        </button>
        <button
          onClick={() => setActiveTab("recalls")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "recalls"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          Recalls (openFDA)
        </button>
        <button
          onClick={() => setActiveTab("import-alerts")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "import-alerts"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
          }`}
        >
          <Ship className="h-4 w-4" />
          Import Alerts
        </button>
      </div>

      {/* Active pipeline */}
      {activeTab === "warning-letters" && <FDAWarningLettersPipeline />}
      {activeTab === "recalls" && <FDARecallsPipeline />}
      {activeTab === "import-alerts" && <FDAImportAlertsPipeline />}
    </div>
  )
}
