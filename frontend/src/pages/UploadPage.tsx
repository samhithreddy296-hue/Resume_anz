import { useState, useCallback, useRef } from 'react'
import { Upload, FileText, X, Loader2, Sparkles, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { analyzeResume, type AnalysisResult } from '../services/api'

interface Props {
  onAnalysisComplete: (result: AnalysisResult, fileName: string) => void
}

const MAX_SIZE_MB = 10
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

export default function UploadPage({ onAnalysisComplete }: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [jobDescription, setJobDescription] = useState('')
  const [showJD, setShowJD] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return 'Only PDF files are supported. Please upload a .pdf resume.'
    }
    if (file.size > MAX_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
      return `File is too large (${sizeMB} MB). Maximum allowed size is ${MAX_SIZE_MB} MB.`
    }
    if (file.size === 0) {
      return 'The selected file is empty. Please choose a valid PDF.'
    }
    return null
  }

  const handleFileSelect = (file: File) => {
    setError(null)
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      setSelectedFile(null)
      return
    }
    setSelectedFile(file)
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError('Please select a PDF resume to analyze.')
      return
    }

    setIsAnalyzing(true)
    setError(null)

    try {
      const result = await analyzeResume(selectedFile, jobDescription || undefined)
      onAnalysisComplete(result, selectedFile.name)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred. Please try again.'
      setError(message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="py-6 px-4 border-b border-white/10">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-500/30">
            <Sparkles className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">AI Resume Analyzer</h1>
            <p className="text-xs text-blue-300">Powered by Google Gemini</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl space-y-6">
          {/* Hero */}
          <div className="text-center space-y-3">
            <h2 className="text-4xl font-bold text-white">
              Analyze your Resume with{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                Generative AI
              </span>
            </h2>
            <p className="text-slate-400 text-lg">
              Upload your PDF resume and get structured insights powered by Google Gemini LLM.
            </p>
          </div>

          {/* Upload Card */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-4">
            <h3 className="text-white font-semibold text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              Upload your Resume
            </h3>

            {/* Drop Zone */}
            {!selectedFile ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer
                  transition-all duration-200
                  ${isDragging
                    ? 'border-blue-400 bg-blue-400/10'
                    : 'border-white/20 hover:border-blue-400/60 hover:bg-white/5'
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleInputChange}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-3">
                  <div className={`p-4 rounded-full transition-colors ${isDragging ? 'bg-blue-500/30' : 'bg-white/10'}`}>
                    <Upload className={`w-8 h-8 ${isDragging ? 'text-blue-300' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {isDragging ? 'Drop your PDF here' : 'Drag & drop your PDF here'}
                    </p>
                    <p className="text-slate-400 text-sm mt-1">
                      or{' '}
                      <span className="text-blue-400 hover:text-blue-300 underline">
                        browse to select
                      </span>
                    </p>
                  </div>
                  <p className="text-slate-500 text-xs">PDF only · Max {MAX_SIZE_MB} MB</p>
                </div>
              </div>
            ) : (
              /* Selected File Display */
              <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{selectedFile.name}</p>
                  <p className="text-slate-400 text-sm">{formatFileSize(selectedFile.size)}</p>
                </div>
                <button
                  onClick={handleRemoveFile}
                  disabled={isAnalyzing}
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50"
                  aria-label="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Job Description Toggle */}
            <div className="border-t border-white/10 pt-4">
              <button
                onClick={() => setShowJD(!showJD)}
                disabled={isAnalyzing}
                className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors disabled:opacity-50"
              >
                {showJD ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showJD ? 'Hide' : 'Add'} Job Description{' '}
                <span className="text-slate-500">(optional — for matching analysis)</span>
              </button>

              {showJD && (
                <div className="mt-3 space-y-2">
                  <label className="text-sm text-slate-400">
                    Paste the job description to get a tailored comparison
                  </label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    disabled={isAnalyzing}
                    placeholder="Paste the job description here..."
                    rows={6}
                    className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm resize-none focus:outline-none focus:border-blue-500/60 focus:bg-white/8 transition-all disabled:opacity-50"
                  />
                </div>
              )}
            </div>

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={!selectedFile || isAnalyzing}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing your resume with Gemini...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Analyze Resume
                </>
              )}
            </button>

            {isAnalyzing && (
              <p className="text-center text-slate-400 text-sm animate-pulse">
                Gemini is reading and analyzing your resume. This may take 10–30 seconds...
              </p>
            )}
          </div>

          {/* Info Banner */}
          <div className="text-center text-slate-500 text-sm space-y-1">
            <p>🔒 Your resume is processed securely on the backend. No data is stored permanently.</p>
            <p>⚡ Analysis is performed by Google Gemini — a Large Language Model.</p>
          </div>
        </div>
      </main>
    </div>
  )
}
