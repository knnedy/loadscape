"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { LogOut, Moon, Settings, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth-client";

export interface AppUser {
  name: string;
  email: string;
}

export function UserMenu({ user }: { user: AppUser }) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const initial = (user.name || user.email).charAt(0).toUpperCase();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="flex h-7 w-7 items-center justify-center rounded-full outline-none">
        <Avatar className="h-7 w-7">
          <AvatarFallback className="bg-secondary text-xs text-secondary-foreground">
            {initial}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-medium text-foreground">
            {user.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={resolvedTheme ?? "dark"}
            onValueChange={(value) => setTheme(value)}>
            <DropdownMenuRadioItem value="light" className="gap-2 text-sm">
              <Sun size={14} />
              Light
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark" className="gap-2 text-sm">
              <Moon size={14} />
              Dark
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2 text-sm">
          <Settings size={14} />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="gap-2 text-sm text-destructive">
          <LogOut size={14} />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
