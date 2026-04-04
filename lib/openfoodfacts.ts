import type { FoodItem } from '@/types'

const BASE_URL = 'https://world.openfoodfacts.org'

export interface OFFProduct {
  product_name: string
  nutriments: {
    'energy-kcal_100g'?: number
    'energy_kcal_100g'?: number
    'energy-kcal'?: number
    proteins_100g?: number
    carbohydrates_100g?: number
    fat_100g?: number
  }
  code: string
}

async function safeFetch(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const text = await res.text()
    return JSON.parse(text)
  } catch {
    return null
  }
}

export async function searchByBarcode(barcode: string): Promise<FoodItem | null> {
  const json = await safeFetch(`${BASE_URL}/api/v0/product/${barcode}.json`) as any
  if (!json || json.status !== 1 || !json.product) return null
  return mapProduct(json.product as OFFProduct, barcode)
}

export async function searchByText(query: string): Promise<FoodItem[]> {
  const encoded = encodeURIComponent(query)
  const json = await safeFetch(
    `${BASE_URL}/cgi/search.pl?search_terms=${encoded}&search_simple=1&action=process&json=1&page_size=20`
  ) as any
  if (!json || !json.products) return []
  return (json.products as OFFProduct[])
    .filter((p) => p.product_name && p.product_name.trim().length > 0)
    .slice(0, 10)
    .map((p) => mapProduct(p, p.code))
}

function getKcal(n: OFFProduct['nutriments']): number {
  return n?.['energy-kcal_100g'] ?? n?.['energy_kcal_100g'] ?? n?.['energy-kcal'] ?? 0
}

function mapProduct(p: OFFProduct, barcode: string): FoodItem {
  return {
    name: p.product_name || 'Produit inconnu',
    barcode,
    calories: Math.round(getKcal(p.nutriments)),
    protein_g: Math.round((p.nutriments?.proteins_100g ?? 0) * 10) / 10,
    carbs_g: Math.round((p.nutriments?.carbohydrates_100g ?? 0) * 10) / 10,
    fat_g: Math.round((p.nutriments?.fat_100g ?? 0) * 10) / 10,
    quantity_g: 100,
  }
}
