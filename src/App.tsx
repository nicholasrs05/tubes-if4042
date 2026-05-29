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
    <>
      <div className="p-3">
        <div className="text-center my-10">
          <h1 className="text-3xl font-bold mb-2">Tugas Besar IF4042 - Sistem Temu Balik Informasi</h1>
          <h2 className="text-2xl font-semibold">Query Expansion dengan Relevance Feedback</h2>
        </div>

        <main className="space-y-8">
          <SystemSettings systemSettings={systemSettings} onSettingsChange={updateSystemSettings} />
          <SearchEngine irEngineRef={irEngineRef} systemSettings={systemSettings} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        </main>
      </div>
    </>
  )
}

export default App