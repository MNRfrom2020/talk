
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@admin/components/ui/card";
import { LayoutGrid, ListMusic, MicVocal, Music } from "lucide-react";

interface StatCardsProps {
    podcastCount: number;
    artistCount: number;
    categoryCount: number;
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


export default function StatCards({ podcastCount, artistCount, categoryCount, playlistCount }: StatCardsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title="মোট অডিও" value={podcastCount} icon={Music} />
            <StatCard title="মোট প্লেলিস্ট" value={playlistCount} icon={ListMusic} />
            <StatCard title="মোট আর্টিস্ট" value={artistCount} icon={MicVocal} />
            <StatCard title="মোট ক্যাটাগরি" value={categoryCount} icon={LayoutGrid} />
        </div>
    );
}
