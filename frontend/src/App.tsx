import { useState } from 'react'
import UploadPage from './pages/UploadPage'
import ResultsPage from './pages/ResultsPage'
import type { AnalysisResult } from './services/api'

type AppPage = 'upload' | 'results'

function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>('upload')
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string>('')

  const handleAnalysisComplete = (result: AnalysisResult, fileName: string) => {
    setAnalysisResult(result)
    setUploadedFileName(fileName)
    setCurrentPage('results')
  }

  const handleStartOver = () => {
    setAnalysisResult(null)
    setUploadedFileName('')
    setCurrentPage('upload')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {currentPage === 'upload' && (
        <UploadPage onAnalysisComplete={handleAnalysisComplete} />
      )}
      {currentPage === 'results' && analysisResult && (
        <ResultsPage
          result={analysisResult}
          fileName={uploadedFileName}
          onStartOver={handleStartOver}
        />
      )}
    </div>
  )
}

export default App
