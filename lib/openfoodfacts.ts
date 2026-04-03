import type { FoodItem } from '@/types'

const BASE_URL = 'https://world.openfoodfacts.org'

export interface OFFProduct {
  product_name: string
  nutriments: {
    'energy-kcal_100g'?: number
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
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('json')) return null
    return await res.json()
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
    `${BASE_URL}/cgi/search.pl?search_terms=${encoded}&search_simple=1&action=process&json=1&page_size=10&fields=product_name,nutriments,code`
  ) as any
  if (!json || !json.products) return []
  return (json.products as OFFProduct[])
    .filter((p) => p.product_name && p.nutriments?.['energy-kcal_100g'] != null)
    .map((p) => mapProduct(p, p.code))
}

function mapProduct(p: OFFProduct, barcode: string): FoodItem {
  return {
    name: p.product_name || 'Produit inconnu',
    barcode,
    calories: Math.round(p.nutriments?.['energy-kcal_100g'] ?? 0),
    protein_g: Math.round((p.nutriments?.proteins_100g ?? 0) * 10) / 10,
    carbs_g: Math.round((p.nutriments?.carbohydrates_100g ?? 0) * 10) / 10,
    fat_g: Math.round((p.nutriments?.fat_100g ?? 0) * 10) / 10,
    quantity_g: 100,
  }
}
