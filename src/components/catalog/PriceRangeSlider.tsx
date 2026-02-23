'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

interface PriceRangeSliderProps {
  min: number
  max: number
  currentMin?: number
  currentMax?: number
  step?: number
  currency?: string
  onChange: (min: number | null, max: number | null) => void
}

export function PriceRangeSlider({
  min,
  max,
  currentMin,
  currentMax,
  step = 1000,
  currency = '₸',
  onChange,
}: PriceRangeSliderProps) {
  const [localMin, setLocalMin] = useState(currentMin ?? min)
  const [localMax, setLocalMax] = useState(currentMax ?? max)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync from parent when URL changes
  useEffect(() => {
    setLocalMin(currentMin ?? min)
    setLocalMax(currentMax ?? max)
  }, [currentMin, currentMax, min, max])

  const debouncedChange = useCallback(
    (newMin: number, newMax: number) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        const minVal = newMin <= min ? null : newMin
        const maxVal = newMax >= max ? null : newMax
        onChange(minVal, maxVal)
      }, 400)
    },
    [min, max, onChange],
  )

  const handleMinRange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.min(Number(e.target.value), localMax - step)
    setLocalMin(val)
    debouncedChange(val, localMax)
  }

  const handleMaxRange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(Number(e.target.value), localMin + step)
    setLocalMax(val)
    debouncedChange(localMin, val)
  }

  const handleMinInput = (e: React.FocusEvent<HTMLInputElement>) => {
    const raw = parseInt(e.target.value)
    if (isNaN(raw)) return
    const val = Math.max(min, Math.min(raw, localMax - step))
    setLocalMin(val)
    debouncedChange(val, localMax)
  }

  const handleMaxInput = (e: React.FocusEvent<HTMLInputElement>) => {
    const raw = parseInt(e.target.value)
    if (isNaN(raw)) return
    const val = Math.min(max, Math.max(raw, localMin + step))
    setLocalMax(val)
    debouncedChange(localMin, val)
  }

  // Progress bar percentages
  const leftPercent = ((localMin - min) / (max - min)) * 100
  const rightPercent = ((max - localMax) / (max - min)) * 100

  const formatNum = (n: number) => new Intl.NumberFormat('ru-RU').format(n)

  return (
    <div>
      {/* Slider track */}
      <div className="relative h-6 mt-1 mb-3">
        {/* Background track */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 bg-gray-200 rounded-full" />
        {/* Active range */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1 bg-[#1B4F72] rounded-full"
          style={{ left: `${leftPercent}%`, right: `${rightPercent}%` }}
        />
        {/* Min thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localMin}
          onChange={handleMinRange}
          className="absolute w-full top-0 h-6 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#1B4F72] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#1B4F72] [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer"
          style={{ zIndex: localMin > max - step * 2 ? 5 : 3 }}
        />
        {/* Max thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localMax}
          onChange={handleMaxRange}
          className="absolute w-full top-0 h-6 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#1B4F72] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#1B4F72] [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer"
          style={{ zIndex: 4 }}
        />
      </div>

      {/* Number inputs */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <input
            type="number"
            value={localMin}
            onChange={(e) => setLocalMin(Number(e.target.value))}
            onBlur={handleMinInput}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm pr-8 focus:outline-none focus:ring-1 focus:ring-[#1B4F72]"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            {currency}
          </span>
        </div>
        <span className="text-gray-400">—</span>
        <div className="flex-1 relative">
          <input
            type="number"
            value={localMax}
            onChange={(e) => setLocalMax(Number(e.target.value))}
            onBlur={handleMaxInput}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm pr-8 focus:outline-none focus:ring-1 focus:ring-[#1B4F72]"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            {currency}
          </span>
        </div>
      </div>

      {/* Min/Max labels */}
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-gray-400">{formatNum(min)} {currency}</span>
        <span className="text-[10px] text-gray-400">{formatNum(max)} {currency}</span>
      </div>
    </div>
  )
}
