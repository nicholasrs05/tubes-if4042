import { useState, useRef } from "react"

import { SystemSettings } from "@/components/system-settings"
import { SearchEngine } from "@/components/search-engine"
import type { SystemSettingsType } from "@/types/system-settings"
import { IREngine } from "@/features/engine/ir-engine"

function App() {
  const irEngineRef = useRef<IREngine>(new IREngine())
  const [systemSettings, setSystemSettings] = useState<SystemSettingsType>({
    stemWords: true,
    eliminateStopWords: true,
    queryTermFrequency: "raw",
    queryInverseDocumentFrequency: true,
    queryNormalization: true,
    documentTermFrequency: "raw",
    documentInverseDocumentFrequency: true,
    documentNormalization: true,
    relevanceFeedbackMethod: "rocchio",
    rocchioBetaConstant: 1,
    rocchioGammaConstant: 1,
    topKRetrievedDocuments: 5,
  })
  const [searchQuery, setSearchQuery] = useState<string>("")

  const updateSystemSettings = <K extends keyof SystemSettingsType>(
    key: K,
    value: SystemSettingsType[K]
  ) => {
    setSystemSettings((prevSettings) => ({
      ...prevSettings,
      [key]: value,
    }))
  }

  return (
    <div className="app-shell min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[100rem]">
        <div className="hero-panel mb-10 overflow-hidden rounded-[2rem] px-6 py-8 text-left shadow-2xl sm:px-10 lg:px-12">
          <div className="relative z-10">
            <p className="eyebrow mb-4">Tugas Besar IF4042 - Sistem Temu Balik Informasi 2026</p>
            <h1 className="hero-title mb-4 text-4xl font-black leading-none tracking-[-0.06em] sm:text-6xl lg:text-6xl">
              Query Expansion dengan Relevance Feedback
            </h1>
            <p className="max-w-2xl text-base leading-7 text-stone-700 sm:text-lg">
              Dibuat oleh Kelompok 5
            </p>
          </div>
        </div>

        <main className="space-y-8">
          <SystemSettings systemSettings={systemSettings} onSettingsChange={updateSystemSettings} />
          <SearchEngine irEngineRef={irEngineRef} systemSettings={systemSettings} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        </main>
      </div>
    </div>
  )
}

export default App
