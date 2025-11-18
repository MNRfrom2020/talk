
"use client";

import * as React from "react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
import { Progress } from "../ui/progress";

const DailyActivityBars = ({ data }: { data: { date: string, minutes: number }[] }) => {
  const maxMinutes = Math.max(...data.map(d => d.minutes), 1); // Avoid division by zero

  return (
    <div className="space-y-3">
      {data.map(({ date, minutes }) => (
        <div key={date} className="grid grid-cols-4 items-center gap-2">
          <span className="col-span-1 text-sm text-muted-foreground">{date}</span>
          <div className="col-span-2">
            <Progress value={(minutes / maxMinutes) * 100} className="h-2" />
          </div>
          <span className="col-span-1 text-right text-sm font-medium">{minutes}m</span>
        </div>
      ))}
    </div>
  );
};

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
            You listened for a total of {totalMinutes} minutes in the last 7 days.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 pt-0 md:p-6 md:pt-0">
          <div className="hidden md:block">
            <ChartContainer
              config={{
                minutes: {
                  label: "Minutes",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[200px] w-full max-w-full"
            >
              <LineChart
                accessibilityLayer
                data={chartData}
                margin={{
                  left: 12,
                  right: 12,
                }}
              >
                <CartesianGrid vertical={false} />
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
                <Line
                  dataKey="minutes"
                  type="monotone"
                  stroke="var(--color-minutes)"
                  strokeWidth={2}
                  dot={{
                    fill: "var(--color-minutes)",
                  }}
                  activeDot={{
                    r: 6,
                  }}
                />
              </LineChart>
            </ChartContainer>
          </div>
          <div className="md:hidden">
             <DailyActivityBars data={chartData} />
          </div>
        </CardContent>
      </Card>
    </>
  );
}
