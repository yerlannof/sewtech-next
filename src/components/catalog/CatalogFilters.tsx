'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { MACHINE_TYPE_LABELS, PURPOSE_LABELS } from '@/lib/catalog-filters'
import { PriceRangeSlider } from './PriceRangeSlider'

interface FilterOption {
  value: string | number
  label: string
  count?: number
}

interface CatalogFiltersProps {
  brands: FilterOption[]
  machineTypes: FilterOption[]
  purposes: FilterOption[]
  needleCounts: FilterOption[]
  platformTypes: FilterOption[]
  stitchTypes: FilterOption[]
  motorTypes: FilterOption[]
  lubricationTypes: FilterOption[]
  threadCounts: FilterOption[]
  activeBrands: number[]
  activeTypes: string[]
  activePurposes: string[]
  activeNeedles: number[]
  activePlatforms: string[]
  activeStitches: string[]
  activeMotors: string[]
  activeLubrications: string[]
  activeThreads: string[]
  activeInStock: boolean
  activeIsNew: boolean
  activeIsFeatured: boolean
  activePriceMin?: number
  activePriceMax?: number
  activeSpeedMin?: number
  activeSpeedMax?: number
  hasSpeedData: boolean
  priceRange?: { min: number; max: number }
}

export function CatalogFilters({
  brands,
  machineTypes,
  purposes,
  needleCounts,
  platformTypes,
  stitchTypes,
  motorTypes,
  lubricationTypes,
  threadCounts,
  activeBrands,
  activeTypes,
  activePurposes,
  activeNeedles,
  activePlatforms,
  activeStitches,
  activeMotors,
  activeLubrications,
  activeThreads,
  activeInStock,
  activeIsNew,
  activeIsFeatured,
  activePriceMin,
  activePriceMax,
  activeSpeedMin,
  activeSpeedMax,
  hasSpeedData,
  priceRange,
}: CatalogFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('page')
      if (value === null || value === '') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  const updateMultipleFilters = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('page')
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      }
      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  const toggleArrayFilter = useCallback(
    (key: string, val: string, currentArr: (string | number)[]) => {
      const current = currentArr.map(String)
      const next = current.includes(val)
        ? current.filter((v) => v !== val)
        : [...current, val]
      updateFilter(key, next.length > 0 ? next.join(',') : null)
    },
    [updateFilter],
  )

  const clearAll = useCallback(() => {
    const params = new URLSearchParams()
    const sort = searchParams.get('sort')
    if (sort) params.set('sort', sort)
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [router, pathname, searchParams])

  const hasActive =
    activeBrands.length > 0 ||
    activeTypes.length > 0 ||
    activePurposes.length > 0 ||
    activeNeedles.length > 0 ||
    activePlatforms.length > 0 ||
    activeStitches.length > 0 ||
    activeMotors.length > 0 ||
    activeLubrications.length > 0 ||
    activeThreads.length > 0 ||
    activeInStock ||
    activeIsNew ||
    activeIsFeatured ||
    activePriceMin ||
    activePriceMax ||
    activeSpeedMin ||
    activeSpeedMax

  return (
    <div className="space-y-5">
      {hasActive && (
        <button
          onClick={clearAll}
          className="text-sm text-[#1B4F72] hover:underline"
        >
          Сбросить все фильтры
        </button>
      )}

      {/* Toggles: In stock / New / Featured */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={activeInStock}
            onChange={(e) => updateFilter('inStock', e.target.checked ? '1' : null)}
            className="w-4 h-4 rounded border-gray-300 text-[#1B4F72] focus:ring-[#1B4F72]"
          />
          <span className="text-sm font-medium text-gray-700">Только в наличии</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={activeIsNew}
            onChange={(e) => updateFilter('isNew', e.target.checked ? '1' : null)}
            className="w-4 h-4 rounded border-gray-300 text-[#1B4F72] focus:ring-[#1B4F72]"
          />
          <span className="text-sm font-medium text-gray-700">Новинки</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={activeIsFeatured}
            onChange={(e) => updateFilter('isFeatured', e.target.checked ? '1' : null)}
            className="w-4 h-4 rounded border-gray-300 text-[#1B4F72] focus:ring-[#1B4F72]"
          />
          <span className="text-sm font-medium text-gray-700">Рекомендуемые</span>
        </label>
      </div>

      {/* Purpose */}
      {purposes.length > 1 && (
        <FilterSection title="Назначение">
          {purposes.map((p) => (
            <FilterCheckbox
              key={p.value}
              label={PURPOSE_LABELS[String(p.value)] || p.label}
              count={p.count}
              checked={activePurposes.includes(String(p.value))}
              onChange={() => toggleArrayFilter('purpose', String(p.value), activePurposes)}
            />
          ))}
        </FilterSection>
      )}

      {/* Brands */}
      {brands.length > 1 && (
        <FilterSection title="Бренд" scrollable>
          {brands.map((brand) => (
            <FilterCheckbox
              key={brand.value}
              label={brand.label}
              count={brand.count}
              checked={activeBrands.includes(Number(brand.value))}
              onChange={() => toggleArrayFilter('brand', String(brand.value), activeBrands)}
            />
          ))}
        </FilterSection>
      )}

      {/* Platform type — spec-based */}
      {platformTypes.length > 1 && (
        <FilterSection title="Тип платформы">
          {platformTypes.map((p) => (
            <FilterCheckbox
              key={p.value}
              label={p.label}
              count={p.count}
              checked={activePlatforms.includes(String(p.value))}
              onChange={() => toggleArrayFilter('platform', String(p.value), activePlatforms)}
            />
          ))}
        </FilterSection>
      )}

      {/* Stitch type — spec-based */}
      {stitchTypes.length > 1 && (
        <FilterSection title="Тип стежка">
          {stitchTypes.map((s) => (
            <FilterCheckbox
              key={s.value}
              label={s.label}
              count={s.count}
              checked={activeStitches.includes(String(s.value))}
              onChange={() => toggleArrayFilter('stitch', String(s.value), activeStitches)}
            />
          ))}
        </FilterSection>
      )}

      {/* Motor type — spec-based */}
      {motorTypes.length > 1 && (
        <FilterSection title="Тип мотора">
          {motorTypes.map((m) => (
            <FilterCheckbox
              key={m.value}
              label={m.label}
              count={m.count}
              checked={activeMotors.includes(String(m.value))}
              onChange={() => toggleArrayFilter('motor', String(m.value), activeMotors)}
            />
          ))}
        </FilterSection>
      )}

      {/* Lubrication type — spec-based */}
      {lubricationTypes.length > 1 && (
        <FilterSection title="Тип смазки">
          {lubricationTypes.map((l) => (
            <FilterCheckbox
              key={l.value}
              label={l.label}
              count={l.count}
              checked={activeLubrications.includes(String(l.value))}
              onChange={() => toggleArrayFilter('lubrication', String(l.value), activeLubrications)}
            />
          ))}
        </FilterSection>
      )}

      {/* Machine types */}
      {machineTypes.length > 1 && (
        <FilterSection title="Тип" scrollable>
          {machineTypes.map((type) => (
            <FilterCheckbox
              key={type.value}
              label={MACHINE_TYPE_LABELS[String(type.value)] || type.label}
              checked={activeTypes.includes(String(type.value))}
              onChange={() => toggleArrayFilter('type', String(type.value), activeTypes)}
            />
          ))}
        </FilterSection>
      )}

      {/* Needle count */}
      {needleCounts.length > 1 && (
        <FilterSection title="Количество игл">
          {needleCounts.map((nc) => (
            <FilterCheckbox
              key={nc.value}
              label={nc.label}
              count={nc.count}
              checked={activeNeedles.includes(Number(nc.value))}
              onChange={() => toggleArrayFilter('needles', String(nc.value), activeNeedles)}
            />
          ))}
        </FilterSection>
      )}

      {/* Thread count — spec-based */}
      {threadCounts.length > 1 && (
        <FilterSection title="Кол-во нитей">
          {threadCounts.map((t) => (
            <FilterCheckbox
              key={t.value}
              label={t.label}
              count={t.count}
              checked={activeThreads.includes(String(t.value))}
              onChange={() => toggleArrayFilter('threads', String(t.value), activeThreads)}
            />
          ))}
        </FilterSection>
      )}

      {/* Price range — slider */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Цена (&#8376;)</h3>
        {priceRange && priceRange.max > priceRange.min ? (
          <PriceRangeSlider
            min={priceRange.min}
            max={priceRange.max}
            currentMin={activePriceMin}
            currentMax={activePriceMax}
            step={Math.max(1000, Math.round((priceRange.max - priceRange.min) / 100) * 1000) || 1000}
            onChange={(newMin, newMax) => {
              updateMultipleFilters({
                priceMin: newMin ? String(newMin) : null,
                priceMax: newMax ? String(newMax) : null,
              })
            }}
          />
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="от"
              defaultValue={activePriceMin || ''}
              onBlur={(e) => updateFilter('priceMin', e.target.value || null)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1B4F72]"
            />
            <span className="text-gray-400">—</span>
            <input
              type="number"
              placeholder="до"
              defaultValue={activePriceMax || ''}
              onBlur={(e) => updateFilter('priceMax', e.target.value || null)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1B4F72]"
            />
          </div>
        )}
      </div>

      {/* Speed range */}
      {hasSpeedData && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Макс. скорость (ст/мин)</h3>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="от"
              defaultValue={activeSpeedMin || ''}
              onBlur={(e) => updateFilter('speedMin', e.target.value || null)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1B4F72]"
            />
            <span className="text-gray-400">—</span>
            <input
              type="number"
              placeholder="до"
              defaultValue={activeSpeedMax || ''}
              onBlur={(e) => updateFilter('speedMax', e.target.value || null)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1B4F72]"
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Reusable filter section
function FilterSection({
  title,
  scrollable,
  children,
}: {
  title: string
  scrollable?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-2">{title}</h3>
      <div className={`space-y-1.5 ${scrollable ? 'max-h-48 overflow-y-auto' : ''}`}>
        {children}
      </div>
    </div>
  )
}

// Reusable checkbox row
function FilterCheckbox({
  label,
  count,
  checked,
  onChange,
}: {
  label: string
  count?: number
  checked: boolean
  onChange: () => void
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 rounded border-gray-300 text-[#1B4F72] focus:ring-[#1B4F72]"
      />
      <span className="text-sm text-gray-700">{label}</span>
      {count !== undefined && (
        <span className="text-xs text-gray-400 ml-auto">{count}</span>
      )}
    </label>
  )
}
