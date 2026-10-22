"use client"

import Link from "next/link"
import {
  ChevronRight,
  Clock,
  FileMusic,
  Headphones,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from "lucide-react"

import {
  dashboardFeatures,
  dashboardFriends,
  dashboardLeaderboard,
  dashboardQuizHistory,
  dashboardUser,
} from "@/components/pages/DashboardPage/data"
import { useAuthUser } from "@/lib/auth"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function DashboardPage() {
  const authUser = useAuthUser()
  const currentUser = authUser
    ? {
        ...dashboardUser,
        id: authUser.user_id.toString(),
      }
    : dashboardUser
  const displayName = authUser?.username ?? ""
  const firstName = authUser?.username.split(" ")[0] ?? ""
  const email = authUser?.email ?? ""
  const avatarInitials = authUser ? getInitials(authUser.username) : ""
  const recentQuizzes = dashboardQuizHistory.slice(0, 3)
  const topFriends = dashboardFriends.filter((friend) => friend.status === "online").slice(0, 3)
  const leaderboard = dashboardLeaderboard.map((entry) =>
    entry.isCurrentUser ? { ...entry, name: authUser?.username ?? entry.name } : entry
  )
  const stats = [
    {
      label: "Total Quizzes",
      value: currentUser.totalQuizzes.toString(),
      icon: Target,
      iconClassName: "text-fuchsia-600",
    },
    {
      label: "Avg Score",
      value: `${currentUser.averageScore}%`,
      icon: TrendingUp,
      iconClassName: "text-emerald-600",
    },
    {
      label: "Best Streak",
      value: currentUser.bestStreak.toString(),
      icon: Zap,
      iconClassName: "text-amber-500",
    },
    {
      label: "Leaderboard",
      value: "#3",
      icon: Trophy,
      iconClassName: "text-orange-500",
    },
  ]

  return (
    <main className="flex-1">
      <section className="border-border/70 bg-background/85 border-b px-5 py-5 backdrop-blur md:px-8 xl:hidden">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-sm">Dashboard</p>
            <h1 className="text-xl font-semibold">{firstName ? `Welcome back, ${firstName}` : ""}</h1>
          </div>
          <Avatar className="size-11 ring-4 ring-fuchsia-500/10">
            <AvatarFallback className="bg-gradient-to-br from-fuchsia-500 to-violet-600 text-sm font-semibold text-white">
              {avatarInitials}
            </AvatarFallback>
          </Avatar>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-6 md:px-8 md:py-8">
        <section className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
          <Card className="from-background via-background to-muted/30 overflow-hidden border-none bg-gradient-to-br shadow-lg shadow-black/5">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <Badge className="mb-4 bg-fuchsia-600 text-white hover:bg-fuchsia-600">
                    Daily momentum
                  </Badge>
                  <h2 className="mb-3 text-3xl font-semibold tracking-tight md:text-4xl">
                    {displayName ? `Welcome back, ${displayName}!` : ""}
                  </h2>
                  <p className="text-muted-foreground max-w-xl text-base md:text-lg">
                    Your dashboard is ready with fresh progress, featured practice modes, and a quick view of the friends pushing you forward this week.
                  </p>
                </div>
                <div className="flex items-center gap-4 self-start rounded-3xl border bg-background/80 p-4 shadow-sm">
                  <Avatar className="size-14 ring-4 ring-fuchsia-500/10">
                    <AvatarFallback className="bg-gradient-to-br from-fuchsia-500 to-violet-600 text-base font-semibold text-white">
                      {avatarInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-muted-foreground text-sm">Current Level</p>
                    <p className="text-xl font-semibold">{currentUser.level}</p>
                    <p className="text-muted-foreground text-sm">{email}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none bg-gradient-to-br from-fuchsia-600 via-violet-600 to-indigo-700 text-white shadow-lg shadow-fuchsia-950/20">
            <CardContent className="flex h-full flex-col justify-between p-6">
              <div>
                <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-white/70">
                  Friends
                </p>
                <h2 className="mb-3 text-2xl font-semibold">Friends activity</h2>
                <p className="max-w-sm text-sm text-white/80">See who is active and competing with you.</p>
              </div>
              <div className="mt-6 space-y-3">
                {topFriends.map((friend) => (
                  <div key={friend.id} className="flex items-center justify-between rounded-2xl bg-white/12 p-4">
                    <div>
                      <p className="text-sm font-semibold">{friend.name}</p>
                      <p className="text-xs text-white/75">Level {friend.level}</p>
                    </div>
                    <p className="text-sm font-semibold">{friend.totalScore.toLocaleString()}</p>
                  </div>
                ))}
                <Button variant="secondary" className="w-full bg-white text-indigo-700 hover:bg-white/90">
                  View all friends
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
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

        <section>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Featured quizzes</h2>
              <p className="text-muted-foreground text-sm">Quick access to practice modes.</p>
            </div>
            <Button variant="ghost" asChild className="justify-start sm:justify-center">
              <Link href="/dashboard">
                All practice modes
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {dashboardFeatures.map((feature, index) => (
              <Card
                key={feature.id}
                className="overflow-hidden border-none bg-card shadow-lg shadow-black/5"
              >
                <div className={`relative h-52 bg-gradient-to-br ${feature.accent}`}>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.35),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(0,0,0,0.18),transparent_40%)]" />
                  <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                    {feature.badge ? (
                      <Badge className="mb-3 bg-white/15 text-white backdrop-blur hover:bg-white/15">
                        {feature.badge}
                      </Badge>
                    ) : null}
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
                        {index === 0 ? (
                          <Headphones className="size-5" />
                        ) : (
                          <FileMusic className="size-5" />
                        )}
                      </div>
                      <div>
                        <p className="text-xl font-semibold">{feature.title}</p>
                        <p className="text-sm text-white/80">Skill-building practice</p>
                      </div>
                    </div>
                  </div>
                </div>
                <CardContent className="p-6">
                  <p className="text-muted-foreground mb-5 text-sm leading-6">{feature.description}</p>
                  <Button className="w-full">{feature.cta}</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-border/70 bg-card/90 shadow-sm">
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="size-5" />
                    Recent activity
                  </CardTitle>
                  <CardDescription>Your latest sessions and response times.</CardDescription>
                </div>
                <Button variant="ghost" asChild className="justify-start sm:justify-center">
                  <Link href="/dashboard">View all</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentQuizzes.map((quiz) => (
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

          <div className="grid gap-6">
            <Card className="border-border/70 bg-card/90 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="size-5" />
                  Friends online
                </CardTitle>
                <CardDescription>Your community snapshot right now.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {topFriends.map((friend) => (
                  <div key={friend.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar>
                          <AvatarFallback className="bg-gradient-to-br from-fuchsia-500 to-pink-500 text-sm font-semibold text-white">
                            {getInitials(friend.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute right-0 bottom-0 size-3 rounded-full border-2 border-background bg-emerald-500" />
                      </div>
                      <div>
                        <p className="font-medium">{friend.name}</p>
                        <p className="text-muted-foreground text-sm">Level {friend.level}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{friend.totalScore.toLocaleString()}</p>
                      <p className="text-muted-foreground text-xs">total score</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/90 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="size-5" />
                  Leaderboard
                </CardTitle>
                <CardDescription>Current top players from your mock dataset.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {leaderboard.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between rounded-2xl p-4 ${
                      entry.isCurrentUser ? "bg-primary/8 border border-primary/15" : "bg-muted/45"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-background flex size-9 items-center justify-center rounded-xl border text-sm font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">
                          {entry.name} {entry.isCurrentUser ? "(You)" : ""}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {entry.quizzesTaken} quizzes • {entry.averageScore}% avg
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold">{entry.score.toLocaleString()}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  )
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}
