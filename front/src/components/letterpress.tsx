import React, { useState, useEffect, useMemo, useRef } from 'react';

// 1. Define the types used in the component
type CellColor = 'neutral' | 'blue' | 'red';

interface Cell {
  letter: string;
  color: CellColor;
}

interface WordResult {
  word: string;
  value: string;
}

const Letterpress: React.FC = () => {
  // 2. Add explicit generics to useState hooks
  const [lettersInput, setLettersInput] = useState<string>('');
  const [grid, setGrid] = useState<Cell[]>([]);
  const [allResults, setAllResults] = useState<WordResult[]>([]);
  const [dictionary, setDictionary] = useState<string[]>([]);
  const [loadingDict, setLoadingDict] = useState<boolean>(true);

  // States for the length limit filter
  const [filterEnabled, setFilterEnabled] = useState<boolean>(false);
  const [maxLength, setMaxLength] = useState<number>(5);

  // States for the paint/drag mode
  const [paintColor, setPaintColor] = useState<CellColor>('blue');
  const [isPainting, setIsPainting] = useState<boolean>(false);

  const gridRef = useRef<HTMLDivElement | null>(null);
  const lastPaintedRef = useRef<number | null>(null);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/redbo/scrabble/master/dictionary.txt')
      .then((res) => res.text())
      .then((text) => {
        const words = text
          .split('\n')
          .map((w) => w.trim().toUpperCase())
          .filter((w) => w.length >= 2);
        setDictionary(words);
        setLoadingDict(false);
      })
      .catch((err) => {
        console.error('Failed to load dictionary:', err);
        setLoadingDict(false);
      });
  }, []);

  const handleGenerate = () => {
    const cleaned = lettersInput.replace(/[^a-zA-Z]/g, '').toUpperCase();
    if (cleaned.length !== 25) {
      alert('Please enter exactly 25 letters.');
      return;
    }
    const newGrid: Cell[] = cleaned.split('').map((letter) => ({
      letter,
      color: 'neutral',
    }));
    setGrid(newGrid);
    setAllResults([]);
  };

  // 3. Paint logic replaces handleCellClick
  const paintIndex = (idx: number) => {
    setGrid((prev) => {
      if (!prev[idx]) return prev;
      if (prev[idx].color === paintColor) return prev;

      const next = [...prev];
      next[idx] = { ...next[idx], color: paintColor };
      return next;
    });
  };

  const stopPainting = () => {
    setIsPainting(false);
    lastPaintedRef.current = null;
  };

  const handlePointerDownCell = (e: React.PointerEvent, idx: number) => {
    // Only left mouse button, but allow touch/pen
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    e.preventDefault();
    setIsPainting(true);
    lastPaintedRef.current = null;

    // Capture the pointer on the grid to keep receiving move events while dragging
    try {
      if (gridRef.current) {
        gridRef.current.setPointerCapture(e.pointerId);
      }
    } catch { }

    paintIndex(idx);
  };

  const handlePointerMoveGrid = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPainting) return;

    // If mouse button released mid-drag, stop.
    if (e.pointerType === 'mouse' && (e.buttons & 1) !== 1) {
      stopPainting();
      return;
    }

    // Guard against SSR
    if (typeof document === 'undefined') return;

    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const btn = el?.closest('button[data-idx]') as HTMLButtonElement | null;
    if (!btn) return;

    const idx = Number(btn.dataset.idx);
    if (Number.isNaN(idx)) return;

    if (lastPaintedRef.current === idx) return;
    lastPaintedRef.current = idx;

    paintIndex(idx);
  };

  const protectedSet = useMemo(() => {
    const pSet = new Set<number>();
    if (grid.length !== 25) return pSet;

    for (let i = 0; i < 25; i++) {
      const color = grid[i].color;
      if (color === 'neutral') continue;

      const r = Math.floor(i / 5);
      const c = i % 5;
      let isProtected = true;

      const neighbors = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];

      for (let [nr, nc] of neighbors) {
        if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5) {
          const ni = nr * 5 + nc;
          if (grid[ni].color !== color) {
            isProtected = false;
            break;
          }
        }
      }

      if (isProtected) pSet.add(i);
    }
    return pSet;
  }, [grid]);

  const handleSolve = () => {
    if (grid.length !== 25) return;

    // 4. Strongly type maps as Record<string, number>
    const boardCounts: Record<string, number> = {};
    grid.forEach((c) => {
      boardCounts[c.letter] = (boardCounts[c.letter] || 0) + 1;
    });

    const validWords = dictionary.filter((word) => {
      const wordCounts: Record<string, number> = {};
      for (const char of word) {
        wordCounts[char] = (wordCounts[char] || 0) + 1;
        if (wordCounts[char] > (boardCounts[char] || 0)) return false;
      }
      return true;
    });

    // 5. Type the scoredWords array
    const scoredWords: WordResult[] = [];

    validWords.forEach((word) => {
      // 6. Type availableTiles as Record<string, number[]>
      const availableTiles: Record<string, number[]> = {};
      grid.forEach((cell, idx) => {
        if (!availableTiles[cell.letter]) availableTiles[cell.letter] = [];
        availableTiles[cell.letter].push(idx);
      });

      const selectedIndices: number[] = [];
      const used = new Set<number>();

      for (const char of word) {
        const candidates = availableTiles[char] || [];
        let bestIdx = -1;
        let bestScore = -100;

        for (const idx of candidates) {
          if (used.has(idx)) continue;
          const isProt = protectedSet.has(idx);
          const color = grid[idx].color;

          let score = 0;
          if (color === 'red' && !isProt) score = 10;
          else if (color === 'neutral') score = 8;
          else if (color === 'blue' && !isProt) score = 4;
          else if (color === 'red' && isProt) score = 2;
          else if (color === 'blue' && isProt) score = 1;

          if (score > bestScore) {
            bestScore = score;
            bestIdx = idx;
          }
        }

        if (bestIdx !== -1) {
          selectedIndices.push(bestIdx);
          used.add(bestIdx);
        }
      }

      if (selectedIndices.length !== word.length) return;

      const newGrid: Cell[] = grid.map((cell, idx) => {
        if (selectedIndices.includes(idx)) {
          if (cell.color === 'red' && protectedSet.has(idx)) return { ...cell };
          return { ...cell, color: 'blue' as CellColor };
        }
        return { ...cell };
      });

      const newProtectedSet = new Set<number>();
      for (let i = 0; i < 25; i++) {
        const color = newGrid[i].color;
        if (color === 'neutral') continue;
        const r = Math.floor(i / 5);
        const c = i % 5;
        let isProtected = true;
        const neighbors = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
        for (let [nr, nc] of neighbors) {
          if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5) {
            const ni = nr * 5 + nc;
            if (newGrid[ni].color !== color) {
              isProtected = false;
              break;
            }
          }
        }
        if (isProtected) newProtectedSet.add(i);
      }

      let oldBlue = 0, oldRed = 0, oldBlueProt = 0, oldRedProt = 0;
      let newBlue = 0, newRed = 0, newBlueProt = 0, newRedProt = 0;

      for (let i = 0; i < 25; i++) {
        if (grid[i].color === 'blue') oldBlue++;
        if (grid[i].color === 'red') oldRed++;
        if (grid[i].color === 'blue' && protectedSet.has(i)) oldBlueProt++;
        if (grid[i].color === 'red' && protectedSet.has(i)) oldRedProt++;

        if (newGrid[i].color === 'blue') newBlue++;
        if (newGrid[i].color === 'red') newRed++;
        if (newGrid[i].color === 'blue' && newProtectedSet.has(i)) newBlueProt++;
        if (newGrid[i].color === 'red' && newProtectedSet.has(i)) newRedProt++;
      }

      const value =
        (newBlue - oldBlue) * 1.0 +
        (oldRed - newRed) * 1.0 +
        (newBlueProt - oldBlueProt) * 0.5 +
        (oldRedProt - newRedProt) * 0.5 +
        word.length * 0.1;

      scoredWords.push({ word, value: value.toFixed(1) });
    });

    scoredWords.sort((a, b) => parseFloat(b.value) - parseFloat(a.value));
    setAllResults(scoredWords);
  };

  // Derive the filtered top 20 list instantly when toggles or results change
  const displayResults = useMemo(() => {
    let filtered = allResults;
    if (filterEnabled) {
      filtered = filtered.filter((item) => item.word.length <= maxLength);
    }
    return filtered.slice(0, 20);
  }, [allResults, filterEnabled, maxLength]);

  return (
    <div className="max-w-md mx-auto p-4 flex flex-col items-center min-h-screen">
      <div className="w-full mb-6">
        <label className="block text-sm mb-2">Enter 25 Letters (Left to right, top to bottom):</label>
        <div className="flex space-x-2">
          <input
            type="text"
            className="flex-1 bg-(--rcolor-highlight) text-white placeholder-gray-500 px-3 py-2 uppercase tracking-widest focus:outline-none focus:ring-0"
            maxLength={25}
            value={lettersInput}
            onChange={(e) => setLettersInput(e.target.value)}
            placeholder="e.g. ABCDEFGHIJKLMNOPQRSTUVWXY"
          />
          <button
            onClick={handleGenerate}
            disabled={lettersInput.replace(/[^a-zA-Z]/g, '').length !== 25}
            className="bg-gray-700 text-white px-4 py-2 font-bold hover:bg-gray-600 transition disabled:opacity-50"
          >
            Generate
          </button>
        </div>
      </div>

      {grid.length === 25 && (
        <div className="flex flex-col items-center w-full space-y-6">

          {/* Color Picker UI */}
          <div className="w-full bg-(--rcolor-highlight) p-3">
            <div className="text-xs text-gray-300 mb-2 font-medium tracking-wide">Select Paint Color:</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPaintColor('blue')}
                className={`flex-1 px-3 py-2 font-bold transition ${paintColor === 'blue' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
                  }`}
              >
                Blue
              </button>

              <button
                type="button"
                onClick={() => setPaintColor('red')}
                className={`flex-1 px-3 py-2 font-bold transition ${paintColor === 'red' ? 'bg-red-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
                  }`}
              >
                Red
              </button>

              <button
                type="button"
                onClick={() => setPaintColor('neutral')}
                className={`flex-1 px-3 py-2 font-bold transition ${paintColor === 'neutral' ? 'bg-gray-500 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
                  }`}
              >
                Neutral
              </button>
            </div>
            <div className="text-xs text-gray-400 mt-2 text-center">
              Tap a cell or drag across the grid to paint.
            </div>
          </div>

          {/* Paintable Grid Area */}
          <div
            ref={gridRef}
            className="grid grid-cols-5 gap-2 p-3 bg-(--rcolor-highlight) touch-none"
            onPointerMove={handlePointerMoveGrid}
            onPointerUp={stopPainting}
            onPointerCancel={stopPainting}
          >
            {grid.map((cell, idx) => {
              const isProt = protectedSet.has(idx);
              let bgColor = 'bg-gray-800 text-gray-200';

              if (cell.color === 'blue') {
                bgColor = isProt ? 'bg-blue-800 text-white' : 'bg-blue-600 text-white';
              } else if (cell.color === 'red') {
                bgColor = isProt ? 'bg-red-800 text-white' : 'bg-red-600 text-white';
              }

              return (
                <button
                  key={idx}
                  data-idx={idx}
                  type="button"
                  onPointerDown={(e) => handlePointerDownCell(e, idx)}
                  className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-2xl font-bold select-none transition-colors duration-200 ${bgColor}`}
                >
                  {cell.letter}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleSolve}
            disabled={loadingDict}
            className="w-full bg-blue-600 text-white py-3 font-bold text-lg tracking-wide hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loadingDict ? 'Loading Dictionary...' : 'Solve'}
          </button>
        </div>
      )}

      {allResults.length > 0 && (
        <div className="w-full mt-8 flex flex-col space-y-4">

          {/* Length Limit Filter Settings (mobile-friendly + no layout shift) */}
          <div className="bg-(--rcolor-highlight) p-3 min-h-[110px]">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setFilterEnabled((v) => !v)}
                className={`px-3 py-2 font-bold transition select-none ${filterEnabled ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'
                  }`}
                aria-pressed={filterEnabled}
              >
                Limit length: {filterEnabled ? 'ON' : 'OFF'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMaxLength((m) => Math.max(2, m - 1))}
                  className={`w-10 h-10 font-bold bg-gray-700 text-white transition ${filterEnabled ? 'hover:bg-gray-600' : 'opacity-40 pointer-events-none'
                    }`}
                  aria-label="Decrease max length"
                >
                  -
                </button>

                <div className="min-w-14 text-center">
                  <div className="text-xs text-gray-400">Max</div>
                  <div className="text-lg font-bold text-white leading-none">{maxLength}</div>
                </div>

                <button
                  type="button"
                  onClick={() => setMaxLength((m) => Math.min(25, m + 1))}
                  className={`w-10 h-10 font-bold bg-gray-700 text-white transition ${filterEnabled ? 'hover:bg-gray-600' : 'opacity-40 pointer-events-none'
                    }`}
                  aria-label="Increase max length"
                >
                  +
                </button>
              </div>
            </div>

            <div className={`${filterEnabled ? '' : 'opacity-40'} transition-opacity mt-3`}>
              <input
                type="range"
                min={2}
                max={25}
                step={1}
                value={maxLength}
                onChange={(e) => setMaxLength(parseInt(e.target.value, 10))}
                disabled={!filterEnabled}
                className={`w-full accent-blue-600 ${filterEnabled ? '' : 'pointer-events-none'
                  }`}
                aria-label="Max word length"
              />

              <div
                className={`flex gap-2 mt-3 overflow-x-auto ${filterEnabled ? '' : 'pointer-events-none'
                  }`}
              >
                {[4, 5, 6, 7, 8, 9, 10, 12, 15].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMaxLength(n)}
                    className={`px-3 py-2 font-bold transition select-none ${maxLength === n ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
                      }`}
                  >
                    ≤{n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Render Filtered Results */}
          {displayResults.length > 0 ? (
            <ul className="space-y-4">
              {displayResults.map((item, idx) => (
                <li key={idx} className="flex flex-col pb-2">
                  <span className="font-bold italic text-lg">{item.word.toLowerCase()}</span>
                  <span className="text-sm font-medium text-(--rcolor-3)">value: {item.value}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 italic">No words found under this length.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Letterpress;
