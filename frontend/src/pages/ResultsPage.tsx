import {
  ArrowLeft,
  User,
  Code2,
  GraduationCap,
  Briefcase,
  FolderGit2,
  Award,
  TrendingUp,
  Target,
  Lightbulb,
  FileCheck,
  CheckCircle2,
  XCircle,
  Info,
  Sparkles,
  RefreshCw,
} from 'lucide-react'
import type {
  AnalysisResult,
  SkillGroup,
  Education,
  Project,
  Experience,
  Certification,
  ResumeScore,
} from '../services/api'

interface Props {
  result: AnalysisResult
  fileName: string
  onStartOver: () => void
}

/* ── Helpers ─────────────────────────────────────────────── */

function isSkillGroup(item: unknown): item is SkillGroup {
  return (
    typeof item === 'object' &&
    item !== null &&
    'category' in item &&
    'skills' in item
  )
}

function Badge({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/25 text-blue-300 text-xs font-medium">
      {text}
    </span>
  )
}

function GreenBadge({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-xs font-medium">
      {text}
    </span>
  )
}

function RedBadge({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/25 text-red-300 text-xs font-medium">
      {text}
    </span>
  )
}

function SectionCard({
  icon,
  title,
  children,
  accentColor = 'blue',
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
  accentColor?: 'blue' | 'emerald' | 'amber' | 'purple' | 'cyan' | 'rose'
}) {
  const colors: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    emerald: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    amber: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    purple: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    cyan: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
    rose: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
  }
  const c = colors[accentColor] || colors.blue
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl border ${c}`}>{icon}</div>
        <h3 className="text-white font-semibold text-lg">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function BulletList({ items }: { items: string[] }) {
  if (!items || items.length === 0) {
    return <p className="text-slate-500 text-sm italic">Not mentioned in the resume.</p>
  }
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-slate-300 text-sm">
          <span className="text-blue-400 mt-1 flex-shrink-0">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function CheckList({ items, variant = 'check' }: { items: string[]; variant?: 'check' | 'x' | 'info' }) {
  if (!items || items.length === 0) {
    return <p className="text-slate-500 text-sm italic">None identified.</p>
  }
  const Icon = variant === 'check' ? CheckCircle2 : variant === 'x' ? XCircle : Info
  const color = variant === 'check' ? 'text-emerald-400' : variant === 'x' ? 'text-red-400' : 'text-amber-400'
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-slate-300 text-sm">
          <Icon className={`w-4 h-4 ${color} mt-0.5 flex-shrink-0`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}


/* ── Score Card ──────────────────────────────────────────── */

function ScoreRing({ score }: { score: number }) {
  const radius = 52
  const stroke = 8
  const normalizedRadius = radius - stroke / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const progress = Math.min(Math.max(score, 0), 100)
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const color =
    score >= 80 ? '#10b981'  // emerald
    : score >= 65 ? '#3b82f6' // blue
    : score >= 45 ? '#f59e0b' // amber
    : '#ef4444'               // red

  const label =
    score >= 80 ? 'Excellent'
    : score >= 65 ? 'Good'
    : score >= 45 ? 'Fair'
    : 'Needs Work'

  return (
    <div className="flex flex-col items-center gap-2">
      <svg height={radius * 2} width={radius * 2} className="-rotate-90">
        <circle
          stroke="#1e293b"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s ease' }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold text-white">{score}</span>
        <span className="text-xs text-slate-400">/100</span>
      </div>
      <span className="text-sm font-semibold" style={{ color }}>{label}</span>
    </div>
  )
}

const SCORE_CATEGORIES: { key: keyof ResumeScore['breakdown']; label: string; max: number; color: string }[] = [
  { key: 'skills',     label: 'Skills',      max: 20, color: '#3b82f6' },
  { key: 'projects',   label: 'Projects',    max: 20, color: '#8b5cf6' },
  { key: 'experience', label: 'Experience',  max: 20, color: '#10b981' },
  { key: 'education',  label: 'Education',   max: 15, color: '#f59e0b' },
  { key: 'formatting', label: 'Formatting',  max: 15, color: '#06b6d4' },
  { key: 'keywords',   label: 'Keywords',    max: 10, color: '#ec4899' },
]

function ScoreCard({ score }: { score: ResumeScore }) {
  const { overall, breakdown, score_note } = score

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-800/60 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
        <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-500/30">
          <Sparkles className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold text-sm">Resume Score</h3>
          <p className="text-slate-500 text-xs">AI-generated estimate based on resume content</p>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Overall ring */}
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="relative flex items-center justify-center">
            <ScoreRing score={overall} />
          </div>
          <p className="text-slate-400 text-xs text-center max-w-[160px]">Overall Resume Score</p>
        </div>

        {/* Category bars */}
        <div className="space-y-3">
          {SCORE_CATEGORIES.map(({ key, label, max, color }) => {
            const raw = breakdown?.[key] ?? 0
            const pct = Math.round((raw / max) * 100)
            return (
              <div key={key}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-300 text-xs font-medium">{label}</span>
                  <span className="text-slate-400 text-xs">{raw}/{max}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="px-5 py-3 border-t border-white/10 bg-slate-900/40">
        <p className="text-slate-500 text-xs italic flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-500" />
          {score_note}
        </p>
      </div>
    </div>
  )
}

/* ── Section Renderers ───────────────────────────────────── */

function SkillsSection({ skills }: { skills: (SkillGroup | string)[] }) {
  if (!skills || skills.length === 0) {
    return <p className="text-slate-500 text-sm italic">No skills mentioned in the resume.</p>
  }

  // Check if it's grouped or flat
  if (isSkillGroup(skills[0])) {
    const grouped = skills as SkillGroup[]
    return (
      <div className="space-y-3">
        {grouped.map((group, i) => (
          <div key={i}>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              {group.category}
            </p>
            <div className="flex flex-wrap gap-2">
              {group.skills.map((s, j) => (
                <Badge key={j} text={s} />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Flat string array
  return (
    <div className="flex flex-wrap gap-2">
      {(skills as string[]).map((s, i) => (
        <Badge key={i} text={s} />
      ))}
    </div>
  )
}

function EducationSection({ education }: { education: Education[] }) {
  if (!education || education.length === 0) {
    return <p className="text-slate-500 text-sm italic">No education mentioned in the resume.</p>
  }
  return (
    <div className="space-y-4">
      {education.map((edu, i) => (
        <div key={i} className="p-4 bg-white/5 rounded-xl border border-white/10">
          <p className="text-white font-medium">{edu.degree || 'Degree not specified'}</p>
          <p className="text-slate-300 text-sm">{edu.institution || 'Institution not specified'}</p>
          <div className="flex gap-3 mt-2">
            {edu.year && <span className="text-slate-400 text-xs">📅 {edu.year}</span>}
            {edu.score && <span className="text-slate-400 text-xs">📊 {edu.score}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

function ProjectsSection({ projects }: { projects: Project[] }) {
  if (!projects || projects.length === 0) {
    return <p className="text-slate-500 text-sm italic">No projects mentioned in the resume.</p>
  }
  return (
    <div className="space-y-4">
      {projects.map((project, i) => (
        <div key={i} className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-2">
          <p className="text-white font-medium">{project.name}</p>
          <p className="text-slate-300 text-sm">{project.description}</p>
          {project.technologies && project.technologies.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {project.technologies.map((tech, j) => (
                <Badge key={j} text={tech} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ExperienceSection({ experience }: { experience: Experience[] }) {
  if (!experience || experience.length === 0) {
    return <p className="text-slate-500 text-sm italic">No professional experience mentioned.</p>
  }

  // Check if the first item signals "no experience"
  const first = experience[0]
  if (
    first.role &&
    first.role.toLowerCase().includes('no professional experience')
  ) {
    return <p className="text-slate-500 text-sm italic">{first.role}</p>
  }

  return (
    <div className="space-y-4">
      {experience.map((exp, i) => (
        <div key={i} className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-white font-medium">{exp.role || 'Role not specified'}</p>
            {exp.duration && (
              <span className="text-slate-400 text-xs flex-shrink-0">📅 {exp.duration}</span>
            )}
          </div>
          {exp.company && <p className="text-blue-300 text-sm">{exp.company}</p>}
          {exp.description && <p className="text-slate-300 text-sm mt-1">{exp.description}</p>}
        </div>
      ))}
    </div>
  )
}

function CertificationsSection({ certifications }: { certifications: Certification[] }) {
  if (!certifications || certifications.length === 0) {
    return <p className="text-slate-500 text-sm italic">No certifications mentioned in the resume.</p>
  }
  return (
    <div className="space-y-2">
      {certifications.map((cert, i) => (
        <div key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
          <Award className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-white text-sm font-medium">{cert.name}</p>
            <p className="text-slate-400 text-xs">
              {cert.issuer && cert.issuer !== 'Not mentioned' ? cert.issuer : ''}
              {cert.year && cert.year !== 'Not mentioned' ? ` · ${cert.year}` : ''}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Main Component ──────────────────────────────────────── */

export default function ResultsPage({ result, fileName, onStartOver }: Props) {
  const { analysis, job_match, job_match_error } = result

  if (!analysis) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-400">No analysis data received from the server.</p>
          <button
            onClick={onStartOver}
            className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 py-4 px-4 bg-slate-900/80 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-500/30">
              <Sparkles className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-white font-bold">AI Resume Analyzer</h1>
              <p className="text-slate-400 text-xs truncate max-w-48">{fileName}</p>
            </div>
          </div>
          <button
            onClick={onStartOver}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-sm rounded-xl border border-white/10 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Analyze Another
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Back button (mobile) */}
        <button
          onClick={onStartOver}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors sm:hidden"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Upload
        </button>

        {/* Title */}
        <div>
          <h2 className="text-2xl font-bold text-white">Resume Analysis Results</h2>
          <p className="text-slate-400 text-sm mt-1">
            Analysis powered by Google Gemini — all insights are based strictly on your resume content.
          </p>
        </div>

        {/* Score Card */}
        {analysis.score && <ScoreCard score={analysis.score} />}

        {/* Summary */}
        <SectionCard
          icon={<User className="w-5 h-5" />}
          title="Resume Summary"
          accentColor="cyan"
        >
          <p className="text-slate-300 leading-relaxed">{analysis.summary || 'Summary not available.'}</p>
        </SectionCard>

        {/* Skills */}
        <SectionCard
          icon={<Code2 className="w-5 h-5" />}
          title="Skills"
          accentColor="blue"
        >
          <SkillsSection skills={analysis.skills} />
        </SectionCard>

        {/* Education */}
        <SectionCard
          icon={<GraduationCap className="w-5 h-5" />}
          title="Education"
          accentColor="purple"
        >
          <EducationSection education={analysis.education} />
        </SectionCard>

        {/* Projects */}
        <SectionCard
          icon={<FolderGit2 className="w-5 h-5" />}
          title="Projects"
          accentColor="cyan"
        >
          <ProjectsSection projects={analysis.projects} />
        </SectionCard>

        {/* Experience */}
        <SectionCard
          icon={<Briefcase className="w-5 h-5" />}
          title="Experience"
          accentColor="emerald"
        >
          <ExperienceSection experience={analysis.experience} />
        </SectionCard>

        {/* Certifications */}
        <SectionCard
          icon={<Award className="w-5 h-5" />}
          title="Certifications"
          accentColor="amber"
        >
          <CertificationsSection certifications={analysis.certifications} />
        </SectionCard>

        {/* Strengths */}
        <SectionCard
          icon={<TrendingUp className="w-5 h-5" />}
          title="Strengths"
          accentColor="emerald"
        >
          <CheckList items={analysis.strengths} variant="check" />
        </SectionCard>

        {/* Areas to Improve */}
        <SectionCard
          icon={<Target className="w-5 h-5" />}
          title="Areas to Improve"
          accentColor="amber"
        >
          <CheckList items={analysis.areas_to_improve} variant="info" />
        </SectionCard>

        {/* Potential Skill Gaps */}
        <SectionCard
          icon={<Lightbulb className="w-5 h-5" />}
          title="Potential Skill Gaps"
          accentColor="rose"
        >
          <p className="text-slate-500 text-xs mb-3 italic">
            These are suggestions to consider, not definitive requirements. Gaps depend on your target role.
          </p>
          <BulletList items={analysis.potential_skill_gaps} />
        </SectionCard>

        {/* Resume Suggestions */}
        <SectionCard
          icon={<FileCheck className="w-5 h-5" />}
          title="Resume Suggestions"
          accentColor="blue"
        >
          <CheckList items={analysis.resume_suggestions} variant="info" />
        </SectionCard>

        {/* Job Description Match */}
        {job_match && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 py-2">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-slate-400 text-sm font-medium">Job Description Match Analysis</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
            <p className="text-slate-500 text-xs text-center italic">
              Note: No ATS score is generated. This is a factual comparison between your resume and the job description.
            </p>

            <SectionCard
              icon={<CheckCircle2 className="w-5 h-5" />}
              title="Matching Skills"
              accentColor="emerald"
            >
              <div className="flex flex-wrap gap-2">
                {job_match.matching_skills && job_match.matching_skills.length > 0
                  ? job_match.matching_skills.map((s, i) => <GreenBadge key={i} text={s} />)
                  : <p className="text-slate-500 text-sm italic">No direct skill matches identified.</p>
                }
              </div>
            </SectionCard>

            <SectionCard
              icon={<XCircle className="w-5 h-5" />}
              title="Potential Gaps"
              accentColor="rose"
            >
              <div className="flex flex-wrap gap-2">
                {job_match.potential_gaps && job_match.potential_gaps.length > 0
                  ? job_match.potential_gaps.map((g, i) => <RedBadge key={i} text={g} />)
                  : <p className="text-slate-500 text-sm italic">No significant gaps identified.</p>
                }
              </div>
            </SectionCard>

            <SectionCard
              icon={<Briefcase className="w-5 h-5" />}
              title="Relevant Resume Evidence"
              accentColor="blue"
            >
              <BulletList items={job_match.relevant_experience} />
            </SectionCard>

            <SectionCard
              icon={<Lightbulb className="w-5 h-5" />}
              title="Alignment Suggestions"
              accentColor="amber"
            >
              <CheckList items={job_match.alignment_suggestions} variant="info" />
            </SectionCard>
          </div>
        )}

        {job_match_error && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <p className="text-amber-300 text-sm">
              <strong>Job description matching note:</strong> {job_match_error}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-slate-600 text-xs py-4">
          Analysis generated by Google Gemini · AI Resume Analyzer · For educational purposes
        </div>
      </main>
    </div>
  )
}
