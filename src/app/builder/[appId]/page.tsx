"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type BlockType = "hero" | "info" | "yhteystiedot" | "aukioloajat" | "tarjoukset";

type BlockDataMap = {
  hero: {
    title: string;
    subtitle: string;
    buttonText: string;
  };
  info: {
    title: string;
    content: string;
  };
  yhteystiedot: {
    phone: string;
    address: string;
    email: string;
  };
  aukioloajat: {
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
  };
  tarjoukset: {
    title: string;
    price: string;
    description: string;
  };
};

type Block<T extends BlockType = BlockType> = {
  id: string;
  type: T;
  data: BlockDataMap[T];
};

const BLOCK_TYPES: BlockType[] = [
  "hero",
  "info",
  "yhteystiedot",
  "aukioloajat",
  "tarjoukset",
];

const DEFAULT_BLOCK_DATA: BlockDataMap = {
  hero: {
    title: "Hero-otsikko",
    subtitle: "Lyhyt esittelyteksti",
    buttonText: "Lue lisaa",
  },
  info: {
    title: "Tietoa meista",
    content: "Kirjoita tarkempi kuvaus palvelusta.",
  },
  yhteystiedot: {
    phone: "+358 40 123 4567",
    address: "Esimerkkikatu 1, Helsinki",
    email: "info@yritys.fi",
  },
  aukioloajat: {
    monday: "09:00 - 17:00",
    tuesday: "09:00 - 17:00",
    wednesday: "09:00 - 17:00",
    thursday: "09:00 - 17:00",
    friday: "09:00 - 17:00",
    saturday: "10:00 - 15:00",
    sunday: "Suljettu",
  },
  tarjoukset: {
    title: "Kevattarjous",
    price: "19,90 EUR",
    description: "Sisaltaa kaikki peruspalvelut alennettuun hintaan.",
  },
};

function createBlock(type: BlockType): Block {
  return {
    id: crypto.randomUUID(),
    type,
    data: { ...DEFAULT_BLOCK_DATA[type] },
  };
}

export default function BuilderPage() {
  const params = useParams<{ appId: string | string[] }>();
  const appId = Array.isArray(params.appId) ? params.appId[0] : params.appId;
  const supabase = useMemo(() => createClient(), []);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessVisible, setSaveSuccessVisible] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const selectedBlock = useMemo(
    () => blocks.find((block) => block.id === selectedBlockId) ?? null,
    [blocks, selectedBlockId],
  );

  const addBlock = (type: BlockType) => {
    const newBlock = createBlock(type);
    setBlocks((prev) => [...prev, newBlock]);
    setSelectedBlockId(newBlock.id);
  };

  const updateSelectedBlockField = (field: string, value: string) => {
    if (!selectedBlockId) return;

    setBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId
          ? {
              ...block,
              data: {
                ...block.data,
                [field]: value,
              },
            }
          : block,
      ),
    );
  };

  const saveBlocks = useCallback(
    async (blocksToSave: Block[]) => {
      if (!appId) return false;

      const {
        data: { user: userFromGetUser },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) {
        console.error("[builder] saveBlocks getUser error:", userError);
      }

      let user = userFromGetUser;
      if (!user) {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (sessionError) {
          console.error("[builder] saveBlocks getSession error:", sessionError);
        }
        user = session?.user ?? null;
      }

      console.log("[builder] saveBlocks user:", user);
      if (!user) {
        console.warn("[builder] saveBlocks: no user; attempting upsert anyway (may fail RLS)");
      }

      setIsSaving(true);

      const upsertRow: { id: string; name: string; blocks: Block[]; user_id?: string } = {
        id: appId,
        name: "My App",
        blocks: blocksToSave,
      };
      if (user?.id) {
        upsertRow.user_id = user.id;
      }

      const { error } = await supabase.from("apps").upsert(upsertRow);
      setIsSaving(false);

      if (error) {
        console.error("[builder] saveBlocks upsert error:", error);
        return false;
      }

      setSaveSuccessVisible(true);
      return true;
    },
    [appId, supabase],
  );

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user?.id ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    const loadBlocks = async () => {
      console.log("[builder] loadBlocks appId:", appId);

      if (!appId) {
        setBlocks([]);
        setCurrentUserId(null);
        setIsHydrated(true);
        return;
      }

      const {
        data: { user: userFromGetUser },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) {
        console.error("[builder] loadBlocks getUser error:", userError);
      }

      let user = userFromGetUser;
      if (!user) {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (sessionError) {
          console.error("[builder] loadBlocks getSession error:", sessionError);
        }
        user = session?.user ?? null;
      }

      console.log("[builder] loadBlocks user:", user);
      setCurrentUserId(user?.id ?? null);

      if (!user) {
        setBlocks([]);
        setIsHydrated(true);
        return;
      }

      const { data, error } = await supabase
        .from("apps")
        .select("blocks")
        .eq("id", appId)
        .single();

      console.log("[builder] loadBlocks response:", { data, error });

      if (error || !data?.blocks) {
        setBlocks([]);
      } else {
        setBlocks(data.blocks as Block[]);
      }

      setIsHydrated(true);
    };

    void loadBlocks();
  }, [appId, supabase]);

  useEffect(() => {
    if (!isHydrated) return;

    const timer = setTimeout(() => {
      void saveBlocks(blocks);
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [blocks, isHydrated, saveBlocks]);

  useEffect(() => {
    if (!saveSuccessVisible) return;

    const timer = setTimeout(() => {
      setSaveSuccessVisible(false);
    }, 1500);

    return () => {
      clearTimeout(timer);
    };
  }, [saveSuccessVisible]);

  return (
    <main className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside className="w-64 border-r border-slate-200 bg-white p-4">
        <h2 className="mb-4 text-lg font-semibold">Blokit</h2>
        <div className="space-y-2">
          {BLOCK_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => addBlock(type)}
              className="w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-left text-sm capitalize transition hover:bg-slate-200"
            >
              + {type}
            </button>
          ))}
        </div>
      </aside>

      <section className="flex-1 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Canvas</h1>
          <div className="flex items-center gap-3">
            {saveSuccessVisible ? <p className="text-xs text-emerald-600">Tallennettu</p> : null}
            <button
              type="button"
              onClick={() => void saveBlocks(blocks)}
              disabled={isSaving}
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Tallennetaan..." : "Tallenna"}
            </button>
          </div>
        </div>
        <div className="space-y-3 rounded-lg border border-dashed border-slate-300 bg-white p-4">
          {blocks.length === 0 ? (
            <p className="text-sm text-slate-500">
              Lisää blokkeja vasemmalta. Ne näkyvät täällä lisäysjärjestyksessä.
            </p>
          ) : (
            blocks.map((block, index) => {
              const isSelected = block.id === selectedBlockId;

              return (
                <div
                  key={block.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedBlockId(block.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedBlockId(block.id);
                    }
                  }}
                  className={`w-full cursor-pointer rounded-lg border p-4 text-left transition ${
                    isSelected
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {index + 1}. {block.type}
                  </p>
                  {block.type === "hero" ? (
                    <>
                      <h3 className="mt-2 text-3xl font-bold tracking-tight">
                        {(block.data as BlockDataMap["hero"]).title}
                      </h3>
                      <p className="mt-2 text-base text-slate-600">
                        {(block.data as BlockDataMap["hero"]).subtitle}
                      </p>
                      <button
                        type="button"
                        className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
                      >
                        {(block.data as BlockDataMap["hero"]).buttonText}
                      </button>
                    </>
                  ) : null}
                  {block.type === "info" ? (
                    <>
                      <h3 className="mt-1 text-base font-semibold">
                        {(block.data as BlockDataMap["info"]).title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {(block.data as BlockDataMap["info"]).content}
                      </p>
                    </>
                  ) : null}
                  {block.type === "yhteystiedot" ? (
                    <>
                      <h3 className="mt-1 text-base font-semibold">
                        {(block.data as BlockDataMap["yhteystiedot"]).phone}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {(block.data as BlockDataMap["yhteystiedot"]).address}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {(block.data as BlockDataMap["yhteystiedot"]).email}
                      </p>
                    </>
                  ) : null}
                  {block.type === "aukioloajat" ? (
                    <>
                      <h3 className="mt-1 text-base font-semibold">Aukioloajat</h3>
                      <div className="mt-2 space-y-1 text-sm text-slate-600">
                        <p>Monday: {(block.data as BlockDataMap["aukioloajat"]).monday}</p>
                        <p>Tuesday: {(block.data as BlockDataMap["aukioloajat"]).tuesday}</p>
                        <p>Wednesday: {(block.data as BlockDataMap["aukioloajat"]).wednesday}</p>
                        <p>Thursday: {(block.data as BlockDataMap["aukioloajat"]).thursday}</p>
                        <p>Friday: {(block.data as BlockDataMap["aukioloajat"]).friday}</p>
                        <p>Saturday: {(block.data as BlockDataMap["aukioloajat"]).saturday}</p>
                        <p>Sunday: {(block.data as BlockDataMap["aukioloajat"]).sunday}</p>
                      </div>
                    </>
                  ) : null}
                  {block.type === "tarjoukset" ? (
                    <>
                      <h3 className="mt-1 text-base font-semibold">
                        {(block.data as BlockDataMap["tarjoukset"]).title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {(block.data as BlockDataMap["tarjoukset"]).price}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {(block.data as BlockDataMap["tarjoukset"]).description}
                      </p>
                    </>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </section>

      <aside className="w-80 border-l border-slate-200 bg-white p-4">
        <h2 className="mb-4 text-lg font-semibold">Asetukset</h2>
        {!selectedBlock ? (
          <p className="text-sm text-slate-500">
            Valitse blokki canvasilta muokataksesi sen sisältöä.
          </p>
        ) : (
          <>
            {selectedBlock.type === "hero" ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="hero-title">
                    Title
                  </label>
                  <input
                    id="hero-title"
                    type="text"
                    value={(selectedBlock.data as BlockDataMap["hero"]).title}
                    onChange={(event) => updateSelectedBlockField("title", event.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="hero-subtitle">
                    Subtitle
                  </label>
                  <input
                    id="hero-subtitle"
                    type="text"
                    value={(selectedBlock.data as BlockDataMap["hero"]).subtitle}
                    onChange={(event) => updateSelectedBlockField("subtitle", event.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="hero-button-text">
                    Button text
                  </label>
                  <input
                    id="hero-button-text"
                    type="text"
                    value={(selectedBlock.data as BlockDataMap["hero"]).buttonText}
                    onChange={(event) => updateSelectedBlockField("buttonText", event.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                  />
                </div>
              </div>
            ) : null}

            {selectedBlock.type === "info" ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="info-title">
                    Title
                  </label>
                  <input
                    id="info-title"
                    type="text"
                    value={(selectedBlock.data as BlockDataMap["info"]).title}
                    onChange={(event) => updateSelectedBlockField("title", event.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="info-content">
                    Content
                  </label>
                  <textarea
                    id="info-content"
                    value={(selectedBlock.data as BlockDataMap["info"]).content}
                    onChange={(event) => updateSelectedBlockField("content", event.target.value)}
                    rows={6}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                  />
                </div>
              </div>
            ) : null}

            {selectedBlock.type === "yhteystiedot" ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="contact-phone">
                    Phone
                  </label>
                  <input
                    id="contact-phone"
                    type="text"
                    value={(selectedBlock.data as BlockDataMap["yhteystiedot"]).phone}
                    onChange={(event) => updateSelectedBlockField("phone", event.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="contact-address">
                    Address
                  </label>
                  <input
                    id="contact-address"
                    type="text"
                    value={(selectedBlock.data as BlockDataMap["yhteystiedot"]).address}
                    onChange={(event) => updateSelectedBlockField("address", event.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="contact-email">
                    Email
                  </label>
                  <input
                    id="contact-email"
                    type="text"
                    value={(selectedBlock.data as BlockDataMap["yhteystiedot"]).email}
                    onChange={(event) => updateSelectedBlockField("email", event.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                  />
                </div>
              </div>
            ) : null}

            {selectedBlock.type === "aukioloajat" ? (
              <div className="space-y-4">
                {(
                  [
                    ["monday", "Monday"],
                    ["tuesday", "Tuesday"],
                    ["wednesday", "Wednesday"],
                    ["thursday", "Thursday"],
                    ["friday", "Friday"],
                    ["saturday", "Saturday"],
                    ["sunday", "Sunday"],
                  ] as const
                ).map(([field, label]) => (
                  <div key={field}>
                    <label
                      className="mb-1 block text-sm font-medium text-slate-700"
                      htmlFor={`hours-${field}`}
                    >
                      {label}
                    </label>
                    <input
                      id={`hours-${field}`}
                      type="text"
                      value={(selectedBlock.data as BlockDataMap["aukioloajat"])[field]}
                      onChange={(event) => updateSelectedBlockField(field, event.target.value)}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                    />
                  </div>
                ))}
              </div>
            ) : null}

            {selectedBlock.type === "tarjoukset" ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="offer-title">
                    Title
                  </label>
                  <input
                    id="offer-title"
                    type="text"
                    value={(selectedBlock.data as BlockDataMap["tarjoukset"]).title}
                    onChange={(event) => updateSelectedBlockField("title", event.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="offer-price">
                    Price
                  </label>
                  <input
                    id="offer-price"
                    type="text"
                    value={(selectedBlock.data as BlockDataMap["tarjoukset"]).price}
                    onChange={(event) => updateSelectedBlockField("price", event.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="offer-description">
                    Description
                  </label>
                  <textarea
                    id="offer-description"
                    value={(selectedBlock.data as BlockDataMap["tarjoukset"]).description}
                    onChange={(event) => updateSelectedBlockField("description", event.target.value)}
                    rows={6}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                  />
                </div>
              </div>
            ) : null}
          </>
        )}
      </aside>
    </main>
  );
}
