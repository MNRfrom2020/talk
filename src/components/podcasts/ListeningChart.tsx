"use client";

import * as React from "react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { format, subDays } from "date-fns";

import { usePlayer } from "@/context/PlayerContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Separator } from "../ui/separator";

export default function ListeningChart() {
  const { listeningLog } = usePlayer();

  const chartData = React.useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateString = format(date, "yyyy-MM-dd");
      const dayName = format(date, "eee");
      const listeningTime = listeningLog[dateString] || 0;
      data.push({
        date: dayName,
        minutes: Math.round(listeningTime / 60),
      });
    }
    return data;
  }, [listeningLog]);

  const totalMinutes = React.useMemo(
    () => chartData.reduce((acc, curr) => acc + curr.minutes, 0),
    [chartData],
  );

  if (totalMinutes === 0) {
    return (
       <div className="space-y-4">
        <Separator />
        <h2 className="text-center text-lg font-medium">Weekly Activity</h2>
         <p className="text-center text-sm text-muted-foreground">Start listening to see your daily stats!</p>
       </div>
    )
  }

  return (
    <>
      <Separator />
      <Card>
        <CardHeader>
          <CardTitle>Weekly Activity</CardTitle>
          <CardDescription>
            You listened for a total of {totalMinutes} minutes this week.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              minutes: {
                label: "Minutes",
                color: "hsl(var(--primary))",
              },
            }}
            className="h-[200px] w-full"
          >
            <BarChart accessibilityLayer data={chartData}>
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value.slice(0, 3)}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `${value}m`}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Bar dataKey="minutes" fill="var(--color-minutes)" radius={8} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </>
  );
}
