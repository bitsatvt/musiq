import { BarChart3, Clock, FileMusic, Headphones, Mic, Music, Target, Trophy } from "lucide-react"

import { dashboardQuizHistory } from "@/components/pages/DashboardPage/data"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

const quizCatalog = [
  {
    id: "tone-recognition",
    title: "Tone Recognition",
    description: "Identify notes by ear with quick recognition drills.",
    gradient: "from-fuchsia-500 via-violet-500 to-indigo-600",
    icon: Headphones,
    completed: 89,
    averageScore: 87,
    bestScore: 98,
  },
  {
    id: "staff-placement",
    title: "Staff Placement Quiz",
    description: "Place notes on an instrument-specific staff and build sight-reading skills.",
    gradient: "from-sky-500 via-cyan-500 to-teal-600",
    icon: FileMusic,
    completed: 72,
    averageScore: 91,
    bestScore: 100,
  },
  {
    id: "interval-recognition",
    title: "Interval Recognition",
    description: "Train your ear to identify distances between notes.",
    gradient: "from-emerald-500 via-green-500 to-teal-600",
    icon: Music,
    completed: 54,
    averageScore: 82,
    bestScore: 94,
  },
  {
    id: "sing-note",
    title: "Sing Note",
    description: "Match a target pitch with your voice and timing.",
    gradient: "from-rose-500 via-pink-500 to-fuchsia-600",
    icon: Mic,
    completed: 32,
    averageScore: 76,
    bestScore: 89,
  },
]

const overallStats = [
  { label: "Total Completed", value: "247", icon: Target, iconClassName: "text-fuchsia-500" },
  { label: "Overall Average", value: "87.5%", icon: BarChart3, iconClassName: "text-emerald-500" },
  { label: "Best Score", value: "100%", icon: Trophy, iconClassName: "text-amber-500" },
  { label: "Avg Response", value: "1.8s", icon: Clock, iconClassName: "text-sky-500" },
]

export default function QuizzesPage() {
  return (
    <main className="flex-1">
      <section className="border-border/70 bg-background/85 border-b px-5 py-5 backdrop-blur md:px-8 xl:hidden">
        <p className="text-muted-foreground text-sm">Library</p>
        <h1 className="text-xl font-semibold">Quizzes</h1>
      </section>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-6 md:px-8 md:py-8">
        <section className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Quiz Library</h1>
          <p className="text-muted-foreground">Choose a mode and continue building your score.</p>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {overallStats.map((stat) => {
            const Icon = stat.icon

            return (
              <Card key={stat.label} className="border-border/70 bg-card/90 gap-0 shadow-sm">
                <CardContent className="flex items-center justify-between p-6">
                  <div>
                    <p className="text-muted-foreground text-sm">{stat.label}</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight">{stat.value}</p>
                  </div>
                  <div className="bg-muted flex size-12 items-center justify-center rounded-2xl">
                    <Icon className={`size-6 ${stat.iconClassName}`} />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {quizCatalog.map((quiz) => {
            const Icon = quiz.icon

            return (
              <Card key={quiz.id} className="overflow-hidden border-none bg-card shadow-lg shadow-black/5">
                <div className={`relative h-44 bg-gradient-to-br ${quiz.gradient}`}>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(0,0,0,0.2),transparent_40%)]" />
                  <div className="absolute inset-0 p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
                        <Icon className="size-5" />
                      </div>
                      <Badge className="bg-white/15 text-white hover:bg-white/15">Practice</Badge>
                    </div>
                    <p className="mt-8 text-2xl font-semibold">{quiz.title}</p>
                  </div>
                </div>
                <CardContent className="space-y-5 p-6">
                  <CardDescription className="text-muted-foreground text-sm leading-6">
                    {quiz.description}
                  </CardDescription>
                  <div className="grid grid-cols-3 gap-3 rounded-2xl bg-muted/45 p-4 text-center">
                    <div>
                      <p className="text-lg font-semibold">{quiz.completed}</p>
                      <p className="text-muted-foreground text-xs">Completed</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{quiz.averageScore}%</p>
                      <p className="text-muted-foreground text-xs">Avg score</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{quiz.bestScore}%</p>
                      <p className="text-muted-foreground text-xs">Best</p>
                    </div>
                  </div>
                  <Button className="w-full" asChild={quiz.id === "tone-recognition" || quiz.id === "staff-placement"}>
                    {quiz.id === "tone-recognition" ? (
                      <Link href="/identification">Start quiz</Link>
                    ) : quiz.id === "staff-placement" ? (
                      <Link href="/staff-placement">Start quiz</Link>
                    ) : (
                      "Start quiz"
                    )}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </section>

        <section>
          <Card className="border-border/70 bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle>Recent quiz activity</CardTitle>
              <CardDescription>Your latest attempts and response times.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {dashboardQuizHistory.map((quiz) => (
                <div
                  key={quiz.id}
                  className="bg-muted/45 flex flex-col gap-3 rounded-2xl border border-transparent p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{quiz.type}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{quiz.difficulty}</Badge>
                      <span className="text-muted-foreground text-xs">
                        {new Date(quiz.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-xl font-semibold">{quiz.score}%</p>
                    <p className="text-muted-foreground text-xs">{quiz.responseTime}s avg response</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>

    </main>
  )
}
