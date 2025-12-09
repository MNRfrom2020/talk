
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Music, Users, ListMusic } from "lucide-react";

interface StatCardsProps {
    podcastCount: number;
    userCount: number;
    playlistCount: number;
}

const StatCard = ({ title, value, icon: Icon }: { title: string, value: number, icon: React.ElementType }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
);


export default function StatCards({ podcastCount, userCount, playlistCount }: StatCardsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard title="মোট অডিও" value={podcastCount} icon={Music} />
            <StatCard title="মোট প্লেলিস্ট" value={playlistCount} icon={ListMusic} />
            <StatCard title="মোট ব্যবহারকারী" value={userCount} icon={Users} />
        </div>
    );
}
