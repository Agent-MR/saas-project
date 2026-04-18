"use client";

import { useMemo, useState } from "react";

type BlockType = "hero" | "info" | "yhteystiedot" | "aukioloajat" | "tarjoukset";

type Block = {
  id: string;
  type: BlockType;
  title: string;
  content: string;
};

const BLOCK_TYPES: BlockType[] = [
  "hero",
  "info",
  "yhteystiedot",
  "aukioloajat",
  "tarjoukset",
];

const DEFAULT_BLOCK_CONTENT: Record<BlockType, { title: string; content: string }> = {
  hero: { title: "Hero-otsikko", content: "Kuvaile yritystäsi lyhyesti." },
  info: { title: "Tietoa meistä", content: "Kirjoita tärkeimmät tiedot." },
  yhteystiedot: { title: "Yhteystiedot", content: "Puhelin, sähköposti, osoite." },
  aukioloajat: { title: "Aukioloajat", content: "Ma-Pe 09:00-17:00" },
  tarjoukset: { title: "Tarjoukset", content: "Lisää ajankohtaiset tarjoukset." },
};

function createBlock(type: BlockType): Block {
  const defaults = DEFAULT_BLOCK_CONTENT[type];

  return {
    id: crypto.randomUUID(),
    type,
    title: defaults.title,
    content: defaults.content,
  };
}

export default function BuilderPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const selectedBlock = useMemo(
    () => blocks.find((block) => block.id === selectedBlockId) ?? null,
    [blocks, selectedBlockId],
  );

  const addBlock = (type: BlockType) => {
    const newBlock = createBlock(type);
    setBlocks((prev) => [...prev, newBlock]);
    setSelectedBlockId(newBlock.id);
  };

  const updateSelectedBlock = (updates: Partial<Pick<Block, "title" | "content">>) => {
    if (!selectedBlockId) return;

    setBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId
          ? {
              ...block,
              ...updates,
            }
          : block,
      ),
    );
  };

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
        <h1 className="mb-4 text-xl font-semibold">Canvas</h1>
        <div className="space-y-3 rounded-lg border border-dashed border-slate-300 bg-white p-4">
          {blocks.length === 0 ? (
            <p className="text-sm text-slate-500">
              Lisää blokkeja vasemmalta. Ne näkyvät täällä lisäysjärjestyksessä.
            </p>
          ) : (
            blocks.map((block, index) => {
              const isSelected = block.id === selectedBlockId;

              return (
                <button
                  key={block.id}
                  type="button"
                  onClick={() => setSelectedBlockId(block.id)}
                  className={`w-full rounded-lg border p-4 text-left transition ${
                    isSelected
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {index + 1}. {block.type}
                  </p>
                  <h3 className="mt-1 text-base font-semibold">{block.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{block.content}</p>
                </button>
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
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="block-title">
                Otsikko
              </label>
              <input
                id="block-title"
                type="text"
                value={selectedBlock.title}
                onChange={(event) => updateSelectedBlock({ title: event.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="block-content">
                Sisältö
              </label>
              <textarea
                id="block-content"
                value={selectedBlock.content}
                onChange={(event) => updateSelectedBlock({ content: event.target.value })}
                rows={6}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
              />
            </div>
          </div>
        )}
      </aside>
    </main>
  );
}
