"use client"

import { Award, Calendar, Target, TrendingUp, Trophy, User, Zap } from "lucide-react"

import {
  dashboardLeaderboard,
  dashboardQuizHistory,
  dashboardUser,
} from "@/components/pages/DashboardPage/data"
import { useAuthUser } from "@/lib/auth"
import InstrumentSettings from "@/components/pages/AccountGroup/instrument-settings"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

const achievements = [
  { id: "first-quiz", title: "First Quiz", status: "Unlocked" },
  { id: "perfect-score", title: "Perfect Score", status: "Unlocked" },
  { id: "hot-streak", title: "Hot Streak", status: "Unlocked" },
  { id: "century", title: "Century Club", status: "Unlocked" },
  { id: "speed", title: "Speed Demon", status: "In progress" },
  { id: "master", title: "Master Musician", status: "In progress" },
]

export default function ProfilePage() {
  const authUser = useAuthUser()
  const currentUser = authUser
    ? {
        ...dashboardUser,
        id: authUser.user_id.toString(),
      }
    : dashboardUser
  const displayName = authUser?.username ?? ""
  const email = authUser?.email ?? ""
  const avatarInitials = authUser ? getInitials(authUser.username) : ""
  const recent = dashboardQuizHistory.slice(0, 4)
  const me = dashboardLeaderboard.find((entry) => entry.isCurrentUser)
  const profileStats = [
    { label: "Total Quizzes", value: currentUser.totalQuizzes.toString(), icon: Target, iconClassName: "text-fuchsia-500" },
    { label: "Average Score", value: `${currentUser.averageScore}%`, icon: TrendingUp, iconClassName: "text-emerald-500" },
    { label: "Best Streak", value: currentUser.bestStreak.toString(), icon: Zap, iconClassName: "text-amber-500" },
    { label: "Leaderboard Rank", value: "#3", icon: Trophy, iconClassName: "text-sky-500" },
  ]

  return (
    <main className="flex-1">
      <section className="border-border/70 bg-background/85 border-b px-5 py-5 backdrop-blur md:px-8 xl:hidden">
        <p className="text-muted-foreground text-sm">Account</p>
        <h1 className="text-xl font-semibold">Profile</h1>
      </section>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-6 md:px-8 md:py-8">
        <section>
          <Card className="from-background via-background to-muted/30 overflow-hidden border-none bg-gradient-to-br shadow-lg shadow-black/5">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="size-16 ring-4 ring-fuchsia-500/10">
                    <AvatarFallback className="bg-gradient-to-br from-fuchsia-500 to-violet-600 text-lg font-semibold text-white">
                      {avatarInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-2xl font-semibold">{displayName}</p>
                    <p className="text-muted-foreground text-sm">{email}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge className="bg-fuchsia-600 text-white hover:bg-fuchsia-600">Level {currentUser.level}</Badge>
                      <Badge variant="outline" className="gap-1">
                        <Calendar className="size-3" />
                        Joined Apr 2026
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl bg-muted/45 p-4 text-center">
                    <p className="text-xl font-semibold">{currentUser.totalQuizzes}</p>
                    <p className="text-muted-foreground text-xs">Quizzes</p>
                  </div>
                  <div className="rounded-2xl bg-muted/45 p-4 text-center">
                    <p className="text-xl font-semibold">{currentUser.averageScore}%</p>
                    <p className="text-muted-foreground text-xs">Avg score</p>
                  </div>
                  <div className="rounded-2xl bg-muted/45 p-4 text-center sm:col-span-1 col-span-2">
                    <p className="text-xl font-semibold">{currentUser.bestStreak}</p>
                    <p className="text-muted-foreground text-xs">Best streak</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <InstrumentSettings key={authUser?.user_id ?? "signed-out"} />

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {profileStats.map((stat) => {
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

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-border/70 bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="size-5" />
                Recent performance
              </CardTitle>
              <CardDescription>Latest quiz attempts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recent.map((quiz) => (
                <div
                  key={quiz.id}
                  className="bg-muted/45 flex items-center justify-between rounded-2xl p-4"
                >
                  <div>
                    <p className="font-medium">{quiz.type}</p>
                    <p className="text-muted-foreground text-xs">{quiz.difficulty} difficulty</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">{quiz.score}%</p>
                    <p className="text-muted-foreground text-xs">{quiz.responseTime}s avg</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <Card className="border-border/70 bg-card/90 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="size-5" />
                  Achievements
                </CardTitle>
                <CardDescription>Milestones from your practice journey.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3">
                {achievements.map((achievement) => (
                  <div key={achievement.id} className="bg-muted/45 flex items-center justify-between rounded-xl p-3">
                    <p className="font-medium">{achievement.title}</p>
                    <Badge variant={achievement.status === "Unlocked" ? "default" : "secondary"}>
                      {achievement.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/90 shadow-sm">
              <CardHeader>
                <CardTitle>Leaderboard snapshot</CardTitle>
                <CardDescription>Your current standing.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-2xl border border-primary/20 bg-primary/8 p-4">
                  <p className="text-sm">Current rank</p>
                  <p className="mt-1 text-2xl font-semibold">#3</p>
                  {me ? (
                    <p className="text-muted-foreground mt-1 text-sm">
                      {me.score.toLocaleString()} points across {me.quizzesTaken} quizzes
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  )
}
