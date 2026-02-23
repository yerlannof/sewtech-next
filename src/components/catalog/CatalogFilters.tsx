'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { MACHINE_TYPE_LABELS, PURPOSE_LABELS } from '@/lib/catalog-filters'

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
  activeBrands: number[]
  activeTypes: string[]
  activePurposes: string[]
  activeNeedles: number[]
  activeInStock: boolean
  activeIsNew: boolean
  activeIsFeatured: boolean
  activePriceMin?: number
  activePriceMax?: number
  activeSpeedMin?: number
  activeSpeedMax?: number
  hasSpeedData: boolean
}

export function CatalogFilters({
  brands,
  machineTypes,
  purposes,
  needleCounts,
  activeBrands,
  activeTypes,
  activePurposes,
  activeNeedles,
  activeInStock,
  activeIsNew,
  activeIsFeatured,
  activePriceMin,
  activePriceMax,
  activeSpeedMin,
  activeSpeedMax,
  hasSpeedData,
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
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Назначение</h3>
          <div className="space-y-1.5">
            {purposes.map((p) => (
              <label key={p.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activePurposes.includes(String(p.value))}
                  onChange={() => toggleArrayFilter('purpose', String(p.value), activePurposes)}
                  className="w-4 h-4 rounded border-gray-300 text-[#1B4F72] focus:ring-[#1B4F72]"
                />
                <span className="text-sm text-gray-700">
                  {PURPOSE_LABELS[String(p.value)] || p.label}
                </span>
                {p.count !== undefined && (
                  <span className="text-xs text-gray-400 ml-auto">{p.count}</span>
                )}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Brands */}
      {brands.length > 1 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Бренд</h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {brands.map((brand) => (
              <label key={brand.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeBrands.includes(Number(brand.value))}
                  onChange={() => toggleArrayFilter('brand', String(brand.value), activeBrands)}
                  className="w-4 h-4 rounded border-gray-300 text-[#1B4F72] focus:ring-[#1B4F72]"
                />
                <span className="text-sm text-gray-700">{brand.label}</span>
                {brand.count !== undefined && (
                  <span className="text-xs text-gray-400 ml-auto">{brand.count}</span>
                )}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Machine types */}
      {machineTypes.length > 1 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Тип</h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {machineTypes.map((type) => (
              <label key={type.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeTypes.includes(String(type.value))}
                  onChange={() => toggleArrayFilter('type', String(type.value), activeTypes)}
                  className="w-4 h-4 rounded border-gray-300 text-[#1B4F72] focus:ring-[#1B4F72]"
                />
                <span className="text-sm text-gray-700">
                  {MACHINE_TYPE_LABELS[String(type.value)] || type.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Needle count */}
      {needleCounts.length > 1 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Количество игл</h3>
          <div className="space-y-1.5">
            {needleCounts.map((nc) => (
              <label key={nc.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeNeedles.includes(Number(nc.value))}
                  onChange={() => toggleArrayFilter('needles', String(nc.value), activeNeedles)}
                  className="w-4 h-4 rounded border-gray-300 text-[#1B4F72] focus:ring-[#1B4F72]"
                />
                <span className="text-sm text-gray-700">{nc.label}</span>
                {nc.count !== undefined && (
                  <span className="text-xs text-gray-400 ml-auto">{nc.count}</span>
                )}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Price range */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Цена (&#8376;)</h3>
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
