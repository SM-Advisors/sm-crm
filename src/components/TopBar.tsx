import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Moon, Sun, User, Building2, Briefcase } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import { useSalesDeals } from "@/hooks/useDeals";

interface SearchResult {
  type: "contact" | "company" | "deal";
  id: string;
  label: string;
  sublabel?: string;
  href: string;
}

function UserMenu() {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Derive initials from email or user metadata
  const email = user?.email ?? "";
  const meta = user?.user_metadata ?? {};
  const fullName = (meta.full_name as string) || (meta.name as string) || "";
  const initials = fullName
    ? fullName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
    : email.slice(0, 2).toUpperCase();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium"
        title={email}
      >
        {initials}
      </button>
      {menuOpen && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-popover border border-border rounded-lg shadow-lg z-50 py-1">
          <div className="px-3 py-2 border-b border-border">
            {fullName && <p className="text-sm font-medium">{fullName}</p>}
            <p className="text-xs text-muted-foreground truncate">{email}</p>
          </div>
          <button
            className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-muted transition-colors"
            onClick={() => {
              setMenuOpen(false);
              signOut();
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function TopBar() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data: contacts = [] } = useContacts();
  const { data: companies = [] } = useCompanies();
  const { data: deals = [] } = useSalesDeals();

  const results = useMemo<SearchResult[]>(() => {
    const q = query.toLowerCase().trim();
    if (q.length < 2) return [];

    const out: SearchResult[] = [];

    for (const c of contacts) {
      const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
      if (
        name.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.title ?? "").toLowerCase().includes(q)
      ) {
        out.push({
          type: "contact",
          id: c.id,
          label: name,
          sublabel: (c as unknown as Record<string, unknown>).company
            ? ((c as unknown as Record<string, unknown>).company as { name: string }).name
            : c.title ?? undefined,
          href: `/contacts/${c.id}`,
        });
      }
      if (out.length >= 20) break;
    }

    for (const co of companies) {
      if (
        co.name.toLowerCase().includes(q) ||
        (co.industry ?? "").toLowerCase().includes(q)
      ) {
        out.push({
          type: "company",
          id: co.id,
          label: co.name,
          sublabel: co.industry ?? undefined,
          href: `/companies/${co.id}`,
        });
      }
      if (out.length >= 30) break;
    }

    for (const d of deals) {
      if (
        d.title.toLowerCase().includes(q) ||
        (d.company?.name ?? "").toLowerCase().includes(q)
      ) {
        out.push({
          type: "deal",
          id: d.id,
          label: d.title,
          sublabel: d.company?.name ?? undefined,
          href: `/sales-pipeline`,
        });
      }
      if (out.length >= 40) break;
    }

    return out.slice(0, 15);
  }, [query, contacts, companies, deals]);

  // Reset selection when results change
  useEffect(() => setSelectedIndex(0), [results]);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      navigate(results[selectedIndex].href);
      setQuery("");
      setOpen(false);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const iconMap = {
    contact: User,
    company: Building2,
    deal: Briefcase,
  };

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card shrink-0">
      <div ref={wrapperRef} className="relative w-72">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />
        <Input
          placeholder="Search contacts, companies, deals…"
          className="pl-9 h-9 bg-background border-border"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { if (query.length >= 2) setOpen(true); }}
          onKeyDown={handleKeyDown}
        />
        {open && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
            {results.map((r, i) => {
              const Icon = iconMap[r.type];
              return (
                <button
                  key={`${r.type}-${r.id}`}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                    i === selectedIndex ? "bg-accent" : "hover:bg-muted/50"
                  }`}
                  onMouseEnter={() => setSelectedIndex(i)}
                  onClick={() => {
                    navigate(r.href);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{r.label}</p>
                    {r.sublabel && (
                      <p className="text-xs text-muted-foreground truncate">{r.sublabel}</p>
                    )}
                  </div>
                  <span className="text-[10px] uppercase text-muted-foreground shrink-0">
                    {r.type}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {open && query.length >= 2 && results.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 p-3 text-sm text-muted-foreground text-center">
            No results found
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-md hover:bg-accent text-muted-foreground"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <UserMenu />
      </div>
    </header>
  );
}
