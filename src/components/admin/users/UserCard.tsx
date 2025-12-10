
"use client";

import Image from "next/image";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CellActions } from "./columns";
import type { User } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, User as UserIcon } from "lucide-react";

interface UserCardProps {
  user: User;
  onEdit: (user: User) => void;
}

export default function UserCard({ user, onEdit }: UserCardProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-row items-start gap-4 space-y-0">
        <Avatar className="h-12 w-12">
          <AvatarImage src={user.image || undefined} alt={user.full_name} />
          <AvatarFallback>
            {user.full_name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1 overflow-hidden">
          <CardTitle className="truncate text-lg">{user.full_name}</CardTitle>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <UserIcon className="h-3 w-3" />
            <span className="truncate">{user.username}</span>
          </p>
        </div>
        <div className="-mr-2 -mt-2">
          <CellActions row={{ original: user }} onEdit={onEdit} />
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="h-4 w-4" />
          <span className="truncate">{user.email}</span>
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          Joined on {new Date(user.created_at).toLocaleDateString()}
        </p>
      </CardFooter>
    </Card>
  );
}
