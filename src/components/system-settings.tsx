import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import type { SystemSettingsType } from "@/types/system-settings"

type SystemSettingsProps = {
    systemSettings: SystemSettingsType
    onSettingsChange: <K extends keyof SystemSettingsType>(
        key: K, 
        value: SystemSettingsType[K]
    ) => void
}

export function SystemSettings({ systemSettings, onSettingsChange }: SystemSettingsProps) {
    return (
        <div className="settings-panel rounded-[1.75rem] p-6 md:p-8">
            <div className="space-y-8">
                <div>
                    <h2 className="text-3xl font-black tracking-[-0.04em]">Konfigurasi Sistem</h2>
                </div>

                <div className="flex flex-col gap-4 lg:flex-row lg:gap-10">
                    <div className="flex items-center gap-3">
                        <Switch
                            size="lg"
                            checked={systemSettings.stemWords} 
                            onCheckedChange={(checked) => onSettingsChange("stemWords", checked)} 
                        />
                        <Label className="text-base font-medium leading-none">Lakukan Stemming</Label>
                    </div>
                    <div className="flex items-center gap-3">
                        <Switch
                            size="lg"
                            checked={systemSettings.eliminateStopWords} 
                            onCheckedChange={(checked) => onSettingsChange("eliminateStopWords", checked)} 
                        />
                        <Label className="text-base font-medium leading-none">Hapus Stop Words</Label>
                    </div>
                </div>

                <div className="flex flex-col gap-8 xl:flex-row xl:gap-10">
                    <div className="min-w-0 flex-1 space-y-4">
                        <h3 className="text-lg font-semibold tracking-tight">Metode Term Weighting untuk Query</h3>

                        <RadioGroup 
                            className="flex flex-col gap-4 lg:flex-row lg:gap-10"
                            value={systemSettings.queryTermFrequency} 
                            onValueChange={(value) => onSettingsChange("queryTermFrequency", value)}
                        >
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="raw"/> 
                                <Label className="text-base leading-none">Raw TF</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="binary"/> 
                                <Label className="text-base leading-none">Binary TF</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="augmented"/> 
                                <Label className="text-base leading-none">Augmented TF</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="logarithmic"/> 
                                <Label className="text-base leading-none">Logarithmic TF</Label>
                            </div>
                        </RadioGroup>

                        <div className="flex items-center gap-3">
                            <Switch
                                size="lg"
                                checked={systemSettings.queryInverseDocumentFrequency} 
                                onCheckedChange={(checked) => onSettingsChange("queryInverseDocumentFrequency", checked)} 
                            />
                            <Label className="text-base font-medium leading-none">Gunakan IDF</Label>
                        </div>

                        <div className="flex items-center gap-3">
                            <Switch
                                size="lg"
                                checked={systemSettings.queryNormalization} 
                                onCheckedChange={(checked) => onSettingsChange("queryNormalization", checked)} 
                            />
                            <Label className="text-base font-medium leading-none">Normalisasi dengan Cosinus</Label>
                        </div>
                    </div>

                    <div className="min-w-0 flex-1 space-y-4">
                    <h3 className="text-lg font-semibold tracking-tight">Metode Term Weighting untuk Dokumen</h3>

                        <RadioGroup 
                            className="flex flex-col gap-4 lg:flex-row lg:gap-10"
                            value={systemSettings.documentTermFrequency}
                            onValueChange={(value) => onSettingsChange("documentTermFrequency", value)}
                        >
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="raw"/> 
                                <Label className="text-base leading-none">Raw TF</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="binary"/> 
                                <Label className="text-base leading-none">Binary TF</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="augmented"/> 
                                <Label className="text-base leading-none">Augmented TF</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="logarithmic"/> 
                                <Label className="text-base leading-none">Logarithmic TF</Label>
                            </div>
                        </RadioGroup>

                        <div className="flex items-center gap-3">
                            <Switch
                                size="lg"
                                checked={systemSettings.documentInverseDocumentFrequency} 
                                onCheckedChange={(checked) => onSettingsChange("documentInverseDocumentFrequency", checked)} 
                            />
                            <Label className="text-base font-medium leading-none">Gunakan IDF</Label>
                        </div>

                        <div className="flex items-center gap-3">
                            <Switch
                                size="lg"
                                checked={systemSettings.documentNormalization} 
                                onCheckedChange={(checked) => onSettingsChange("documentNormalization", checked)} 
                            />
                            <Label className="text-base font-medium leading-none">Normalisasi dengan Cosinus</Label>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-8 xl:flex-row xl:gap-10">
                    <div className="min-w-0 flex-1 space-y-4">
                        <h3 className="text-lg font-semibold tracking-tight">Metode Relevance Feedback</h3>

                        <RadioGroup 
                            className="flex flex-col gap-4 lg:flex-row lg:gap-10"
                            value={systemSettings.relevanceFeedbackMethod}
                            onValueChange={(value) => onSettingsChange("relevanceFeedbackMethod", value)}
                        >
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="rocchio"/> 
                                <Label className="text-base leading-none">Rocchio</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="ide"/> 
                                <Label className="text-base leading-none">Ide Reguler</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="ide-dec-hi"/> 
                                <Label className="text-base leading-none">Ide dec Hi</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {systemSettings.relevanceFeedbackMethod === "rocchio" && (
                        <div className="min-w-0 flex-1 space-y-4">
                            <h3 className="text-lg font-semibold tracking-tight">
                                Parameter untuk Rocchio
                            </h3>

                            <div className="flex flex-col gap-4 lg:flex-row lg:gap-10">
                                <div className="flex items-center gap-2">
                                    <Label className="text-base font-medium leading-none">
                                        <i>&beta;</i> =
                                    </Label>

                                    <Input
                                        className="h-7 w-16 px-2 py-0 text-center"
                                        type="number"
                                        value={systemSettings.rocchioBetaConstant ?? ""}
                                        onChange={(e) =>
                                            onSettingsChange(
                                                "rocchioBetaConstant",
                                                e.target.value === "" ? 0 : parseFloat(e.target.value)
                                            )
                                        }
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <Label className="text-base font-medium leading-none">
                                        <i>&gamma;</i> =
                                    </Label>

                                    <Input
                                        className="h-7 w-16 px-2 py-0 text-center"
                                        type="number"
                                        value={systemSettings.rocchioGammaConstant ?? ""}
                                        onChange={(e) =>
                                            onSettingsChange(
                                                "rocchioGammaConstant",
                                                e.target.value === "" ? 0 : parseFloat(e.target.value)
                                            )
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="min-w-0 flex-1 space-y-4">
                        <h3 className="text-lg font-semibold tracking-tight">Parameter Top-k Dokumen untuk Di-Retrieve</h3>

                        <div className="flex items-center gap-1">
                            <Label className="text-base font-medium leading-none"><i>k</i> =</Label>
                            <Input
                                className="w-15 text-center"
                                type="number"
                                value={systemSettings.topKRetrievedDocuments}
                                onChange={(e) => onSettingsChange("topKRetrievedDocuments", parseInt(e.target.value))}
                            />
                        </div>
                    </div>
            </div>
        </div>
    )
}
