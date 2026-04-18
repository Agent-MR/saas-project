"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type AppRow = {
  id: string;
  user_id: string | null;
  created_at: string | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [apps, setApps] = useState<AppRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadApps = async () => {
      setIsLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setIsLoading(false);
        setError(userError?.message ?? "Kayttajaa ei loytynyt.");
        return;
      }

      const { data, error: appsError } = await supabase
        .from("apps")
        .select("id,user_id,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (appsError) {
        setError(appsError.message);
        setApps([]);
      } else {
        setApps((data as AppRow[]) ?? []);
      }

      setIsLoading(false);
    };

    void loadApps();
  }, [supabase]);

  const handleCreateApp = () => {
    const newId = crypto.randomUUID();
    router.push(`/builder/${newId}`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl bg-slate-50 p-6 text-slate-900">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Tervetuloa</h1>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreateApp}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Luo uusi app
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Logout
            </button>
          </div>
        </div>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Omat appit</h2>

          {isLoading ? <p className="mt-3 text-sm text-slate-500">Ladataan appeja...</p> : null}

          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

          {!isLoading && !error && apps.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Et ole luonut viela yhtaan appia.</p>
          ) : null}

          {!isLoading && !error && apps.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {apps.map((app) => (
                <li key={app.id}>
                  <Link
                    href={`/builder/${app.id}`}
                    className="block rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition hover:border-slate-300 hover:bg-slate-100"
                  >
                    <p className="font-medium text-slate-900">{app.id}</p>
                    {app.created_at ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Luotu {new Date(app.created_at).toLocaleString("fi-FI")}
                      </p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>
    </main>
  );
}
