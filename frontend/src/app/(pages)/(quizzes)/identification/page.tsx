"use client"

import React, { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { getProfile, startToneQuiz, updateToneQuiz, type Instrument, type ToneQuizState } from "@/lib/api"
import { getAuthToken } from "@/lib/auth"
import * as Tone from "tone"
import { Play, ChevronDown, Loader2 } from "lucide-react"
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

const INSTRUMENT_SAMPLES: Record<string, Record<string, string>> = {
  Piano: {
    "C4": "https://nbrosowsky.github.io/tonejs-instruments/samples/piano/C4.mp3",
    "G4": "https://nbrosowsky.github.io/tonejs-instruments/samples/piano/G4.mp3",
  },
  Violin: {
    "C4": "https://nbrosowsky.github.io/tonejs-instruments/samples/violin/C4.mp3",
    "G4": "https://nbrosowsky.github.io/tonejs-instruments/samples/violin/G4.mp3",
  },
  Guitar: {
    "C4": "https://nbrosowsky.github.io/tonejs-instruments/samples/guitar-acoustic/C4.mp3",
    "G4": "https://nbrosowsky.github.io/tonejs-instruments/samples/guitar-acoustic/G4.mp3",
  },
  Trumpet: {
    "C4": "https://nbrosowsky.github.io/tonejs-instruments/samples/trumpet/C4.mp3",
    "G4": "https://nbrosowsky.github.io/tonejs-instruments/samples/trumpet/G4.mp3",
  }
}

const QuizWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen w-full bg-[#F3F4F9] flex flex-col relative overflow-hidden font-sans">
    <NavigationHeader />
    <div className="absolute top-20 inset-x-0 bottom-0 opacity-15 pointer-events-none select-none">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="staff" width="400" height="240" patternUnits="userSpaceOnUse" patternTransform="rotate(-4)">
            <g stroke="#6D52A3" strokeWidth="1">
              <path d="M0 60 H400 M0 80 H400 M0 100 H400 M0 120 H400 M0 140 H400" />
            </g>
            <text x="20" y="135" fontSize="80" fill="#6D52A3" opacity="0.4" fontFamily="serif">𝄞</text>
            <circle cx="160" cy="110" r="6" fill="#6D52A3" opacity="0.3" />
            <path d="M166 110 V70" stroke="#6D52A3" strokeWidth="2" opacity="0.3" />
            <circle cx="300" cy="130" r="6" fill="#6D52A3" opacity="0.3" />
            <path d="M306 130 V90" stroke="#6D52A3" strokeWidth="2" opacity="0.3" />
          </pattern>
          <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="white" stopOpacity="0" />
            <stop offset="0.1" stopColor="white" stopOpacity="1" />
            <stop offset="0.8" stopColor="white" stopOpacity="1" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id="staff-mask">
            <rect width="100%" height="100%" fill="url(#fade)" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="url(#staff)" mask="url(#staff-mask)" />
      </svg>
    </div>
    <div className="relative z-10 w-full flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">{children}</div>
    </div>
  </div>
)

export default function ToneRecognitionQuiz() {
  const sampler = useRef<Tone.Sampler | null>(null)
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null)
  const instrument = selectedInstrument?.name ?? ""
  const [profile, setProfile] = useState<{
    status: "loading" | "ready" | "error"
    instruments: Instrument[]
    error: string
  }>({ status: "loading", instruments: [], error: "" })
  const [profileAttempt, setProfileAttempt] = useState(0)
  const [audioAttempt, setAudioAttempt] = useState(0)
  const audioKey = `${instrument}:${audioAttempt}`
  const [audio, setAudio] = useState<{ key: string; status: "ready" | "error" } | null>(null)
  const isLoaded = audio?.key === audioKey && audio.status === "ready"
  const audioError = audio?.key === audioKey && audio.status === "error"
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState("")
  const startRequest = useRef<AbortController | null>(null)
  const quizRequest = useRef<AbortController | null>(null)
  const quizActions = useRef(Promise.resolve())
  const quizGeneration = useRef(0)
  const playbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const availableInstruments = profile.instruments.filter((item) =>
    Object.prototype.hasOwnProperty.call(INSTRUMENT_SAMPLES, item.name))
  const canStart = profile.status === "ready" && isLoaded && !starting &&
    availableInstruments.some((item) => item.instrument_id === selectedInstrument?.instrument_id)

  // Quiz flow states
  const [started, setStarted] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(1)
  const [totalCorrect, setTotalCorrect] = useState(0)
  const [finished, setFinished] = useState(false)
  const [quizId, setQuizId] = useState("")

  // Question states
  const [currentNote, setCurrentNote] = useState("")
  const [choices, setChoices] = useState<string[]>([])
  const [feedback, setFeedback] = useState("")
  const [answeredCorrectly, setAnsweredCorrectly] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  // Fetch current selections for each new attempt rather than trusting cached account data.
  useEffect(() => {
    const controller = new AbortController()
    const token = getAuthToken()
    getProfile(controller.signal)
      .then((user) => {
        if (controller.signal.aborted) return
        if (getAuthToken() !== token) throw new Error("Your account changed. Please reload your instruments.")
        setProfile({ status: "ready", instruments: user.instruments, error: "" })
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setProfile({ status: "error", instruments: [], error: "Unable to load your instruments. Check that you are logged in, then try again." })
        }
      })
    return () => controller.abort()
  }, [profileAttempt])

  // Ignore callbacks from old samplers when switching instruments or leaving the quiz.
  useEffect(() => {
    if (!instrument || !Object.prototype.hasOwnProperty.call(INSTRUMENT_SAMPLES, instrument)) return
    let active = true
    const newSampler = new Tone.Sampler({
      urls: INSTRUMENT_SAMPLES[instrument],
      volume: instrument === "Violin" ? -10 : 0,
      onload: () => { if (active) setAudio({ key: audioKey, status: "ready" }) },
      onerror: () => { if (active) setAudio({ key: audioKey, status: "error" }) },
    }).toDestination()
    sampler.current = newSampler
    return () => {
      active = false
      newSampler.dispose()
      if (sampler.current === newSampler) sampler.current = null
    }
  }, [instrument, audioKey])

  useEffect(() => () => {
    startRequest.current?.abort()
    quizRequest.current?.abort()
    quizGeneration.current += 1
    if (playbackTimer.current) clearTimeout(playbackTimer.current)
  }, [])

  const reloadInstruments = () => {
    quizGeneration.current += 1
    setSelectedInstrument(null)
    setAudio(null)
    setStartError("")
    setProfile({ status: "loading", instruments: [], error: "" })
    setProfileAttempt((attempt) => attempt + 1)
  }

  // Sync the displayed question and score with the backend response.
  const applyQuizState = (quiz: ToneQuizState) => {
    setQuizId(quiz.quiz_id)
    setCurrentQuestion(quiz.current_question)
    setTotalCorrect(quiz.total_correct)
    setFinished(quiz.finished)
    setCurrentNote(quiz.note)
    setChoices(quiz.choices)
    setAnsweredCorrectly(quiz.answered_correctly)
  }

  const playNote = async () => {
    if (!sampler.current || !isLoaded || !currentNote) return

    setIsPlaying(true)
    try {
      await Tone.start()
      sampler.current?.triggerAttackRelease(currentNote, "2n")
      playbackTimer.current = setTimeout(() => setIsPlaying(false), 800)
    } catch {
      setIsPlaying(false)
      setFeedback("Unable to play audio. Please try Play Note again.")
    }
  }

  // Send one quiz action and display its result or request error.
  const submitQuizAction = async (action: "answer" | "next", choice?: string) => {
    const controller = new AbortController()
    quizRequest.current = controller
    const token = getAuthToken()
    try {
      const quiz = await updateToneQuiz(quizId, action, currentQuestion, choice, controller.signal)
      if (controller.signal.aborted) return
      if (getAuthToken() !== token) throw new Error("Your account changed. Please reload the quiz.")
      applyQuizState(quiz)
      setFeedback(action === "answer" ? (quiz.answered_correctly ? "Correct!" : "Try again") : "")
    } catch (error) {
      if (!controller.signal.aborted) setFeedback(error instanceof Error ? error.message : "Unable to update the quiz. Please try again.")
    } finally {
      quizRequest.current = null
    }
  }

  // Process clicks in order and skip queued actions after a reset or unmount.
  const queueQuizAction = (action: "answer" | "next", choice?: string) => {
    const generation = quizGeneration.current
    quizActions.current = quizActions.current.then(async () => {
      if (generation === quizGeneration.current) await submitQuizAction(action, choice)
    })
  }

  const checkAnswer = (choice: string) => queueQuizAction("answer", choice)
  const nextQuestion = () => queueQuizAction("next")

  // Recheck the selected instrument before requesting a new backend quiz.
  const startQuiz = async () => {
    if (!canStart || !selectedInstrument || startRequest.current) return
    const controller = new AbortController()
    startRequest.current = controller
    const token = getAuthToken()
    setStarting(true)
    setStartError("")
    try {
      // Resume audio on the button gesture and recheck membership before starting.
      await Tone.start()
      const user = await getProfile(controller.signal)
      if (controller.signal.aborted) return
      if (getAuthToken() !== token) throw new Error("Your account changed. Reload your instruments before starting.")
      setProfile({ status: "ready", instruments: user.instruments, error: "" })
      if (!user.instruments.some((item) => item.instrument_id === selectedInstrument.instrument_id && item.name === instrument)) {
        setSelectedInstrument(null)
        throw new Error("Your profile instruments changed. Choose an instrument from the updated list.")
      }
      const quiz = await startToneQuiz(controller.signal)
      if (controller.signal.aborted) return
      if (getAuthToken() !== token) throw new Error("Your account changed. Reload your instruments before starting.")
      // The selected instrument stays fixed until this attempt is finished.
      applyQuizState(quiz)
      setStarted(true)
      setFeedback("")
    } catch (error) {
      if (!controller.signal.aborted) setStartError(error instanceof Error ? error.message : "Unable to start the quiz. Please try again.")
    } finally {
      startRequest.current = null
      if (!controller.signal.aborted) setStarting(false)
    }
  }

  if (!started) {
    return (
      <QuizWrapper>
        <Card className="text-center p-12 bg-white rounded-3xl shadow-xl border-none">
          <CardHeader>
            <CardTitle className="text-5xl font-extrabold mb-4 text-[#1A1A1A] tracking-tight font-montserrat">
              Tone Recognition Quiz
            </CardTitle>
            <CardDescription className="text-xl text-gray-500 font-inter">
              Master your perfect pitch. 10 questions to test your ears.
            </CardDescription>
          </CardHeader>
          
          <div className="flex flex-col items-center gap-3 mt-4">
            <p id="quiz-instrument-label" className="text-xs font-bold text-gray-400 uppercase tracking-widest font-inter">
              Choose your instrument
            </p>
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
            {profile.status === "ready" && availableInstruments.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button aria-labelledby="quiz-instrument-label quiz-instrument-value" disabled={starting} variant="outline" className="w-56 justify-between border-2 py-6 rounded-xl font-bold font-inter">
                  <span id="quiz-instrument-value">{instrument || "Choose an instrument"}</span>
                  <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-white border-2 rounded-xl shadow-xl">
                {availableInstruments.map((item) => (
                  <DropdownMenuItem 
                    key={item.instrument_id}
                    onClick={() => {
                      setSelectedInstrument(item)
                      setAudioAttempt((attempt) => attempt + 1)
                      setStartError("")
                    }}
                    className="font-inter font-medium py-3 hover:bg-stone-100 cursor-pointer"
                  >
                    {item.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            )}
            {profile.status === "ready" && <Button variant="link" asChild><Link href="/profile">Edit instruments in profile</Link></Button>}
            {audioError && (
              <div className="space-y-2">
                <p role="alert" className="text-red-600">Unable to load audio for {instrument}.</p>
                <Button variant="outline" onClick={() => setAudioAttempt((attempt) => attempt + 1)}>Retry audio</Button>
              </div>
            )}
            {startError && <p role="alert" className="text-red-600">{startError}</p>}
          </div>

          <CardFooter className="mt-8 flex justify-center">
            <Button 
              onClick={startQuiz}
              disabled={!canStart}
              className="bg-[#6D52A3] hover:bg-[#5A4389] text-white text-xl px-12 py-7 rounded-2xl transition-all shadow-lg font-inter font-bold min-w-[200px]"
            >
              {starting ? "Checking profile..." : instrument && !isLoaded && !audioError ? (
                <>
                  <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                  Loading Audio...
                </>
              ) : (
                "Start Learning"
              )}
            </Button>
          </CardFooter>
        </Card>
      </QuizWrapper>
    )
  }

  if (finished) {
    return (
      <QuizWrapper>
        <Card className="text-center p-12 bg-white rounded-3xl shadow-xl border-none">
          <CardHeader>
            <CardTitle className="text-5xl font-extrabold text-[#1A1A1A] font-montserrat">
              Quiz Complete!
            </CardTitle>
            <CardDescription className="text-2xl mt-6 text-gray-600 font-inter">
              Score: <span className="text-[#6D52A3] font-bold">{totalCorrect}/10</span>
            </CardDescription>
          </CardHeader>
          <CardFooter className="mt-10 flex justify-center">
            <Button 
              onClick={() => {
                setStarted(false)
                reloadInstruments()
              }}
              className="bg-[#6D52A3] hover:bg-[#5A4389] text-white text-xl px-10 py-6 rounded-xl font-bold font-inter"
            >
              Try Again
            </Button>
          </CardFooter>
        </Card>
      </QuizWrapper>
    )
  }

  return (
    <QuizWrapper>
      <Card className="bg-white rounded-3xl shadow-2xl border-none p-6 md:p-12 transition-all">
        <CardHeader className="text-center p-0">
          <CardTitle className="text-4xl md:text-5xl font-extrabold text-[#1A1A1A] tracking-wider font-montserrat mb-2">
            Tone Recognition Quiz
          </CardTitle>
          <p className="text-sm font-bold text-gray-500 font-inter tracking-[0.2em]">
            Question {currentQuestion} of 10 ({instrument})
          </p>
          
          <div className="w-full max-w-md mx-auto h-1.5 bg-gray-100 rounded-full mt-4 overflow-hidden">
            <div 
              className="h-full bg-[#6D52A3] transition-all duration-500" 
              style={{ width: `${(currentQuestion / 10) * 100}%` }}
            />
          </div>

          <CardDescription className="text-xl text-gray-800 mt-6 font-medium font-inter">
            Listen and guess the note.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col items-center gap-8 mt-8">
          <Button
            onClick={playNote}
            disabled={isPlaying || !isLoaded}
            className={`bg-[#6D52A3] hover:bg-[#5A4389] text-white text-2xl px-14 py-10 rounded-2xl shadow-lg transition-all font-inter font-bold tracking-wide
              ${isPlaying ? "animate-pulse ring-purple-300 scale-105" : "active:scale-95"}
            `}
          >
            {isPlaying ? (
              <>
                <Loader2 className="mr-3 h-8 w-8 animate-spin" />
                Playing...
              </>
            ) : (
              <>
                <Play className="mr-3 h-8 w-8 fill-current" />
                Play Note
              </>
            )}
          </Button>

          <div className="h-8">
            {feedback && (
              <p className={`text-sm font-bold tracking-widest uppercase font-inter ${
                feedback.includes("Correct!") ? "text-green-500" : "text-red-500"
              }`}>
                {feedback}
              </p>
            )}
          </div>
        </CardContent>

        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4">
          {choices.map((note, i) => (
            <Button
              key={i}
              variant="outline"
              onClick={() => checkAnswer(note)}
              disabled={answeredCorrectly}
              className={`text-xl font-bold py-8 rounded-xl border-2 transition-all font-inter
                ${answeredCorrectly && note === currentNote 
                  ? 'border-[#6D52A3] bg-purple-50 text-[#6D52A3]' 
                  : 'border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300'}
              `}
            >
              {note}
            </Button>
          ))}
        </CardContent>

        <CardFooter className="flex justify-end items-center mt-12 px-4">
          <Button
            onClick={nextQuestion}
            disabled={!answeredCorrectly}
            className={`text-lg font-bold px-8 py-6 rounded-xl transition-all font-inter
              ${answeredCorrectly 
                ? "bg-white border-2 border-gray-200 text-gray-800 shadow-sm hover:bg-gray-50" 
                : "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"}
            `}
          >
            Next Question
          </Button>
        </CardFooter>
      </Card>
    </QuizWrapper>
  )
}
