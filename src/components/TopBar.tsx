import { Search, Moon, Sun } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";

export function TopBar() {
  const { theme, toggleTheme } = useTheme();
  const { signOut } = useAuth();

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card shrink-0">
      <div className="relative w-72">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search..."
          className="pl-9 h-9 bg-background border-border"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-md hover:bg-accent text-muted-foreground"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          onClick={signOut}
          className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium"
          title="Sign out"
        >
          CK
        </button>
      </div>
    </header>
  );
}
