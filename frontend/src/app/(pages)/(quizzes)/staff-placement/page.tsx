"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Check, ChevronDown, FileMusic, MousePointerClick, RotateCcw } from "lucide-react"
import { advanceQuizAttempt, completeQuizAttempt, getProfile, getStaffPlacementInstruments, startQuizAttempt, submitQuizAnswer, type Instrument, type QuizAttempt, type StaffPlacementInstrumentConfig, type StaffPlacementQuestion } from "@/lib/api"
import { getAuthToken } from "@/lib/auth"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NavigationHeader } from "@/components/shared/NavigationHeader"

type InstrumentConfig = StaffPlacementInstrumentConfig

type StaffPosition = {
  id: string
  label: string
  kind: "line" | "space"
  noteLetter: NoteLetter
  noteName: string
  indicatorX: number
  y: number
}

type NoteLetter = "A" | "B" | "C" | "D" | "E" | "F" | "G"

type StaffLayout = {
  id: string
  label: string
  clef: "treble" | "bass"
  top: number
}

function StaffLines({ y }: { y: number }) {
  return (
    <g stroke="currentColor" strokeWidth="1.5">
      {[0, 16, 32, 48, 64].map((offset) => (
        <line key={offset} x1="108" x2="676" y1={y + offset} y2={y + offset} />
      ))}
    </g>
  )
}

function createStaffPositions(id: string, staffTop: number, label: string, clef: StaffLayout["clef"]): StaffPosition[] {
  const noteNames = clef === "treble"
    ? ["F5", "E5", "D5", "C5", "B4", "A4", "G4", "F4", "E4"]
    : ["A3", "G3", "F3", "E3", "D3", "C3", "B2", "A2", "G2"]

  return Array.from({ length: 9 }, (_, index) => ({
    id: `${id}-${index}`,
    kind: index % 2 === 0 ? "line" : "space",
    noteLetter: noteNames[index][0] as NoteLetter,
    noteName: noteNames[index],
    label: `${label} ${getPositionLabel(index)}`,
    indicatorX: 300 + index * 42,
    y: staffTop - 16 + index * 8,
  }))
}

function getPositionLabel(index: number): string {
  const kind = index % 2 === 0 ? "line" : "space"
  const number = kind === "line" ? index / 2 + 1 : Math.floor(index / 2) + 1

  return `${kind} ${number}`
}

function getStaffLayouts(instrument: InstrumentConfig): StaffLayout[] {
  return instrument.layouts.map((layout) => ({
    id: layout.clef,
    label: layout.label,
    clef: layout.clef,
    top: layout.clef === "bass" ? 158 : instrument.staffType === "grand" ? 58 : 64,
  }))
}

function getStaffPositions(instrument: InstrumentConfig): StaffPosition[] {
  return getStaffLayouts(instrument).flatMap((staff) =>
    createStaffPositions(staff.id, staff.top, staff.label, staff.clef),
  )
}

function PlacementStaff({
  instrument,
  selectedPosition,
  hoveredPosition,
  onHover,
  onSelect,
  disabled,
  positions,
}: {
  instrument: InstrumentConfig
  selectedPosition: string | null
  hoveredPosition: string | null
  onHover: (position: StaffPosition | null) => void
  onSelect: (position: StaffPosition) => void
  disabled: boolean
  positions: StaffPosition[]
}) {
  const isGrandStaff = instrument.staffType === "grand"
  const viewBoxHeight = isGrandStaff ? 290 : 190

  return (
    <div className="overflow-hidden rounded-2xl border border-[#6D52A3]/20 bg-[#FCFBFF] p-3 sm:p-5">
      <svg
        className="h-auto w-full text-[#42365D]"
        viewBox={`0 0 760 ${viewBoxHeight}`}
        role="group"
        aria-label={`${instrument.name} staff. Choose a position for the note.`}
      >
        <defs>
          <linearGradient id="staff-preview-fill" x1="0" x2="1">
            <stop offset="0" stopColor="#6D52A3" stopOpacity="0.11" />
            <stop offset="1" stopColor="#6D52A3" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <rect x="90" y="18" width="600" height={isGrandStaff ? 246 : 136} rx="12" fill="url(#staff-preview-fill)" />
        {isGrandStaff ? (
          <>
            <path d="M74 48 C48 64, 48 104, 74 120 C48 136, 48 176, 74 216" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <StaffLines y={42} />
            <StaffLines y={142} />
            <text x="122" y="112" fontFamily="serif" fontSize="88" aria-hidden="true">𝄞</text>
            <text x="129" y="212" fontFamily="serif" fontSize="70" aria-hidden="true">𝄢</text>
            <text x="702" y="78" fill="#6D52A3" fontSize="15" fontWeight="600">Treble</text>
            <text x="702" y="178" fill="#6D52A3" fontSize="15" fontWeight="600">Bass</text>
          </>
        ) : (
          <>
            <StaffLines y={48} />
            <text x="122" y="116" fontFamily="serif" fontSize="88" aria-hidden="true">𝄞</text>
            <text x="702" y="88" fill="#6D52A3" fontSize="15" fontWeight="600">Treble</text>
          </>
        )}
        {positions.map((position) => {
          const isSelected = selectedPosition === position.id
          const isHovered = hoveredPosition === position.id
          return (
            <g
              key={position.id}
              role="button"
              tabIndex={disabled ? -1 : 0}
              aria-label={`Place the note on ${position.label}`}
              aria-pressed={isSelected}
              aria-disabled={disabled}
              className={disabled ? "cursor-not-allowed opacity-50 focus:outline-none" : "cursor-pointer focus:outline-none focus-visible:outline-none"}
              onMouseEnter={() => !disabled && onHover(position)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => !disabled && onHover(position)}
              onBlur={() => onHover(null)}
              onClick={() => !disabled && onSelect(position)}
              onKeyDown={(event) => {
                if (!disabled && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault()
                  onSelect(position)
                }
              }}
            >
              <rect
                x="220"
                y={position.y - 5}
                width="430"
                height="10"
                rx="5"
                fill="#6D52A3"
                fillOpacity={isSelected ? 0.14 : isHovered ? 0.1 : 0}
                stroke="#6D52A3"
                strokeWidth={isSelected || isHovered ? 1.5 : 0}
                strokeDasharray={isSelected ? undefined : "4 4"}
              />
              {isSelected ? (
                <g aria-hidden="true">
                  <line
                    x1={position.indicatorX + 5}
                    x2={position.indicatorX + 5}
                    y1={position.y - 2}
                    y2={position.y - 30}
                    stroke="#6D52A3"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <ellipse
                    cx={position.indicatorX}
                    cy={position.y}
                    rx="8"
                    ry="5"
                    transform={`rotate(-20 ${position.indicatorX} ${position.y})`}
                    fill="#6D52A3"
                  />
                </g>
              ) : (
                <circle
                  cx={position.indicatorX}
                  cy={position.y}
                  r={isHovered ? 8 : 5}
                  fill={isHovered ? "#6D52A3" : "#FFFFFF"}
                  fillOpacity={isHovered ? 0.2 : 0.01}
                  stroke="#6D52A3"
                  strokeWidth={isHovered ? 1.5 : 1}
                  strokeDasharray="3 3"
                />
              )}
              {isSelected && <text x={position.indicatorX + 18} y={position.y + 5} fill="#6D52A3" fontSize="13" fontWeight="700">Selected {position.kind}</text>}
            </g>
          )
        })}
        <text x="108" y={viewBoxHeight - 16} fill="#6D52A3" fontSize="16" fontWeight="600">
          Written range: {instrument.range}
        </text>
      </svg>
    </div>
  )
}

function QuizWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#F3F4F9] font-sans">
      <NavigationHeader />
      <div className="pointer-events-none absolute inset-x-0 top-20 bottom-0 select-none opacity-15">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <pattern id="staff-placement-background" width="400" height="240" patternUnits="userSpaceOnUse" patternTransform="rotate(-4)">
              <g stroke="#6D52A3" strokeWidth="1">
                <path d="M0 60 H400 M0 80 H400 M0 100 H400 M0 120 H400 M0 140 H400" />
              </g>
              <text x="20" y="135" fontSize="80" fill="#6D52A3" opacity="0.4" fontFamily="serif">𝄞</text>
              <circle cx="160" cy="110" r="6" fill="#6D52A3" opacity="0.3" />
              <path d="M166 110 V70" stroke="#6D52A3" strokeWidth="2" opacity="0.3" />
              <circle cx="300" cy="130" r="6" fill="#6D52A3" opacity="0.3" />
              <path d="M306 130 V90" stroke="#6D52A3" strokeWidth="2" opacity="0.3" />
            </pattern>
            <linearGradient id="staff-placement-fade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="white" stopOpacity="0" />
              <stop offset="0.1" stopColor="white" stopOpacity="1" />
              <stop offset="0.8" stopColor="white" stopOpacity="1" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>
            <mask id="staff-placement-mask">
              <rect width="100%" height="100%" fill="url(#staff-placement-fade)" />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="url(#staff-placement-background)" mask="url(#staff-placement-mask)" />
        </svg>
      </div>
      <div className="relative z-10 flex w-full flex-1 items-center justify-center p-4">
        <div className="w-full max-w-4xl">{children}</div>
      </div>
    </div>
  )
}

export default function StaffPlacementQuiz() {
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null)
  const [profile, setProfile] = useState<{
    status: "loading" | "ready" | "error"
    instruments: Instrument[]
    error: string
  }>({ status: "loading", instruments: [], error: "" })
  const [profileAttempt, setProfileAttempt] = useState(0)
  const [instrumentConfigs, setInstrumentConfigs] = useState<InstrumentConfig[]>([])
  const [starting, setStarting] = useState(false)
  const startRequest = useRef<AbortController | null>(null)
  const [quizStarted, setQuizStarted] = useState(false)
  const [quizFinished, setQuizFinished] = useState(false)
  const [attempt, setAttempt] = useState<QuizAttempt<StaffPlacementQuestion> | null>(null)
  const [score, setScore] = useState(0)
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null)
  const [hoveredPosition, setHoveredPosition] = useState<StaffPosition | null>(null)
  const [submissionResult, setSubmissionResult] = useState<"correct" | "incorrect" | null>(null)
  const [selectedNote, setSelectedNote] = useState<string | null>(null)
  const [hintVisible, setHintVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const availableInstruments = profile.instruments.filter((item) =>
    instrumentConfigs.some((config) => config.name === item.name))
  const instrument = instrumentConfigs.find((item) => item.name === selectedInstrument?.name) ?? instrumentConfigs[0]
  const canStart = profile.status === "ready" && !starting &&
    availableInstruments.some((item) => item.instrument_id === selectedInstrument?.instrument_id)
  const displayPositions = instrument ? getStaffPositions(instrument) : []
  const staffPositions = displayPositions
  const targetNote = attempt?.question ?? {
    id: "",
    display_name: "",
    letter: "A",
    octave: 4,
    staff: "treble" as const,
    position_id: "",
    hint: "",
    choices: [],
  }
  const selectedPositionData = staffPositions.find((position) => position.id === selectedPosition)

  useEffect(() => {
    const controller = new AbortController()
    const token = getAuthToken()
    Promise.all([getProfile(controller.signal), getStaffPlacementInstruments(controller.signal)])
      .then(([user, configs]) => {
        if (controller.signal.aborted) return
        if (getAuthToken() !== token) throw new Error("Your account changed. Please reload your instruments.")
        setInstrumentConfigs(configs)
        setProfile({ status: "ready", instruments: user.instruments, error: "" })
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setProfile({ status: "error", instruments: [], error: "Unable to load your instruments. Check that you’re logged in, then try again." })
        }
      })
    return () => controller.abort()
  }, [profileAttempt])

  useEffect(() => () => startRequest.current?.abort(), [])

  function reloadInstruments() {
    setSelectedInstrument(null)
    setProfile({ status: "loading", instruments: [], error: "" })
    setProfileAttempt((attempt) => attempt + 1)
  }

  function resetPlacement() {
    setSelectedPosition(null)
    setHoveredPosition(null)
    setSubmissionResult(null)
    setSelectedNote(null)
    setHintVisible(false)
  }

  async function submitPlacement() {
    if (!selectedPositionData || !attempt || isLoading) return
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const result = await submitQuizAnswer<StaffPlacementQuestion>(attempt.attempt_id, attempt.question_number, selectedPositionData.id)
      setAttempt(result)
      setSubmissionResult(result.is_correct ? "correct" : "incorrect")
      setSelectedNote(selectedPositionData.noteName)
      setScore(result.first_try_correct)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update the quiz.")
    } finally {
      setIsLoading(false)
    }
  }

  async function moveToNextQuestion() {
    if (!attempt || !attempt.answered_correctly || isLoading) return
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const result = attempt.question_number === attempt.total_questions
        ? await completeQuizAttempt<StaffPlacementQuestion>(attempt.attempt_id, attempt.question_number)
        : await advanceQuizAttempt<StaffPlacementQuestion>(attempt.attempt_id, attempt.question_number)
      setAttempt(result)
      setScore(result.first_try_correct)
      setQuizFinished(result.completed)
      setSubmissionResult(null)
      resetPlacement()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to advance the quiz.")
    } finally {
      setIsLoading(false)
    }
  }

  async function startQuiz() {
    if (!canStart || !selectedInstrument || startRequest.current) return
    const controller = new AbortController()
    startRequest.current = controller
    const token = getAuthToken()
    setStarting(true)
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const user = await getProfile(controller.signal)
      if (controller.signal.aborted) return
      if (getAuthToken() !== token) throw new Error("Your account changed. Reload your instruments before starting.")
      setProfile({ status: "ready", instruments: user.instruments, error: "" })
      if (!user.instruments.some((item) => item.instrument_id === selectedInstrument.instrument_id && item.name === selectedInstrument.name)) {
        setSelectedInstrument(null)
        throw new Error("Your profile instruments changed. Choose an instrument from the updated list.")
      }
      const session = await startQuizAttempt<StaffPlacementQuestion>("staff_placement", selectedInstrument.instrument_id, controller.signal)
      setAttempt(session)
      setQuizStarted(true)
      setQuizFinished(false)
      setScore(session.first_try_correct)
      resetPlacement()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to start the quiz.")
    } finally {
      startRequest.current = null
      if (!controller.signal.aborted) setStarting(false)
      setIsLoading(false)
    }
  }

  function restartQuiz() {
    setAttempt(null)
    setQuizStarted(false)
    setQuizFinished(false)
    setScore(0)
    resetPlacement()
  }

  return (
    <QuizWrapper>
      {!quizStarted ? (
        <Card className="border-none bg-white p-8 text-center shadow-xl md:p-12">
          <CardHeader>
            <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-[#6D52A3]/10 text-[#6D52A3]">
              <FileMusic className="size-7" />
            </div>
            <CardTitle className="mb-4 text-4xl font-extrabold tracking-tight text-[#1A1A1A] md:text-5xl">
              Staff Placement Quiz
            </CardTitle>
            <CardDescription className="text-lg text-gray-500 md:text-xl">
              Choose an instrument before you begin.
            </CardDescription>
          </CardHeader>

          <CardContent className="mt-6 flex flex-col items-center gap-3">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-400" htmlFor="instrument-selector">
              Choose your instrument
            </label>
            {profile.status === "loading" && <p role="status">Loading your instruments...</p>}
            {profile.status === "error" && (
              <div className="space-y-3">
                <p role="alert" className="text-red-600">{profile.error}</p>
                <Button variant="outline" onClick={reloadInstruments}>Retry</Button>
                <Button variant="link" asChild><Link href="/login">Log in</Link></Button>
              </div>
            )}
            {profile.status === "ready" && availableInstruments.length === 0 && (
              <p role="status">{profile.instruments.length === 0
                ? "Select instruments in your profile before starting this quiz."
                : "None of your profile instruments are supported by this quiz yet. Choose Piano, Violin, Guitar, or Trumpet in your profile."}</p>
            )}
            {profile.status === "ready" && availableInstruments.length > 0 && <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button id="instrument-selector" disabled={starting} variant="outline" className="w-56 justify-between rounded-xl border-2 py-6 font-bold">
                  {selectedInstrument?.name ?? "Choose an instrument"}
                  <ChevronDown className="size-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 rounded-xl border-2 bg-white shadow-xl">
                {availableInstruments.map((item) => (
                  <DropdownMenuItem
                    key={item.instrument_id}
                    onClick={() => {
                      setSelectedInstrument(item)
                      setAttempt(null)
                      setQuizStarted(false)
                      setQuizFinished(false)
                      setScore(0)
                      resetPlacement()
                    }}
                    className="cursor-pointer py-3 font-medium hover:bg-stone-100"
                  >
                    <span>{item.name}</span>
                    {selectedInstrument?.instrument_id === item.instrument_id && <Check className="ml-auto size-4 text-[#6D52A3]" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>}
            {profile.status === "ready" && <Button variant="link" asChild><Link href="/profile">Edit instruments in profile</Link></Button>}
            {selectedInstrument && <p className="mt-2 text-sm text-gray-500">{selectedInstrument.name} selected for this practice session.</p>}
          </CardContent>

          <CardFooter className="mt-6 justify-center pb-0">
            <Button
              onClick={startQuiz}
              disabled={!canStart || isLoading}
              className="min-w-56 rounded-2xl bg-[#6D52A3] px-10 py-7 text-lg font-bold text-white"
            >
              {starting ? "Checking profile..." : isLoading ? "Loading questions..." : "Next"}
            </Button>
          </CardFooter>
          {errorMessage && <p role="alert" className="mt-4 text-center text-sm text-red-600">{errorMessage}</p>}
        </Card>
      ) : quizFinished ? (
        <Card className="border-none bg-white p-8 text-center shadow-xl md:p-12">
          <CardHeader>
            <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-[#6D52A3]/10 text-[#6D52A3]">
              <Check className="size-7" />
            </div>
            <CardTitle className="mb-4 text-4xl font-extrabold tracking-tight text-[#1A1A1A] md:text-5xl">
              Quiz complete
            </CardTitle>
            <CardDescription className="text-lg text-gray-500 md:text-xl">
              {instrument!.name} staff placement
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-6">
            <p className="text-3xl font-extrabold text-[#6D52A3]">
              You scored {score} out of {attempt?.total_questions ?? 0}
            </p>
          </CardContent>
          <CardFooter className="mt-6 justify-center pb-0">
            <Button onClick={restartQuiz} className="min-w-56 rounded-2xl bg-[#6D52A3] px-10 py-7 text-lg font-bold text-white">
              Start over
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card className="border-none bg-white p-5 shadow-xl md:p-7">
        <CardHeader className="px-0 pt-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="mb-2 text-sm font-semibold text-[#6D52A3]">Question {attempt?.question_number} of {attempt?.total_questions} · Instrument locked: {instrument!.name}</p>
              <div className="mb-4 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-gray-100">
                <div className="h-full bg-[#6D52A3] transition-all" style={{ width: `${((attempt?.question_number ?? 1) / (attempt?.total_questions ?? 1)) * 100}%` }} />
              </div>
              <CardTitle className="text-2xl text-[#1A1A1A]">Place the {targetNote.display_name} on the staff</CardTitle>
              <CardDescription className="mt-1">{instrument!.name} · {instrument!.clefs} · Written range {instrument!.range}</CardDescription>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-[#6D52A3]/10 px-4 py-3 text-[#6D52A3]" aria-label={`Target note ${targetNote.display_name}`}>
              <span className="font-serif text-5xl leading-none">♩</span>
              <div className="text-left">
                <p className="text-xs font-bold uppercase tracking-widest">Target note</p>
                <p className="text-xl font-extrabold">{targetNote.display_name}</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-0 pb-0">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500">
            <p className="flex items-center gap-2"><MousePointerClick className="size-4 text-[#6D52A3]" /> Hover to highlight a position, then click to place the note.</p>
            {hoveredPosition && !submissionResult && <p className="font-semibold text-[#6D52A3]">{hoveredPosition.label}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => setHintVisible((visible) => !visible)} className="rounded-xl">
              {hintVisible ? "Hide hint" : "Show hint"}
            </Button>
            {hintVisible && <p className="text-sm font-semibold text-[#6D52A3]">Hint: {targetNote.hint}</p>}
          </div>
          <PlacementStaff
            instrument={instrument!}
            selectedPosition={selectedPosition}
            hoveredPosition={hoveredPosition?.id ?? null}
            positions={staffPositions}
            onHover={setHoveredPosition}
            onSelect={(position) => setSelectedPosition(position.id)}
            disabled={attempt?.answered_correctly ?? false}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className={submissionResult === "correct" ? "text-sm font-semibold text-green-600" : submissionResult === "incorrect" ? "text-sm font-semibold text-red-600" : "text-sm text-gray-500"}>
              {submissionResult === "correct" ? `Correct. This position represents ${targetNote.display_name}.` : submissionResult === "incorrect" ? `Incorrect. You selected ${selectedNote ?? "a different note"}; continue to the next question below.` : selectedPosition ? "Placement selected. You can change it before submitting." : instrument!.notationNote}
            </p>
            {!attempt?.answered_correctly && selectedPosition ? (
              <Button variant="outline" onClick={resetPlacement} className="gap-2 rounded-xl">
                <RotateCcw className="size-4" /> Clear placement
              </Button>
            ) : null}
          </div>
        </CardContent>
          <CardFooter className="justify-center px-0 pb-0 pt-6">
            <Button
              disabled={(!selectedPosition && !attempt?.answered_correctly) || isLoading}
              onClick={attempt?.answered_correctly ? moveToNextQuestion : submitPlacement}
              className="min-w-56 rounded-2xl bg-[#6D52A3] px-10 py-7 text-lg font-bold text-white disabled:opacity-60"
            >
              {isLoading ? "Checking..." : attempt?.answered_correctly ? "Next question" : "Submit placement"}
            </Button>
          </CardFooter>
          {errorMessage && <p role="alert" className="pt-4 text-center text-sm text-red-600">{errorMessage}</p>}
        </Card>
      )}
    </QuizWrapper>
  )
}
