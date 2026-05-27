import { SystemSettings } from "@/components/system-settings"
import { useState } from "react"
import type { SystemSettingsType } from "@/types/system-settings"

function App() {
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
  })

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

        <main>
          <SystemSettings systemSettings={systemSettings} onSettingsChange={updateSystemSettings} />
        </main>
      </div>
    </>
  )
}

export default App