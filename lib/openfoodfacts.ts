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

export async function searchByBarcode(barcode: string): Promise<FoodItem | null> {
  const res = await fetch(`${BASE_URL}/api/v0/product/${barcode}.json`)
  const json = await res.json()

  if (json.status !== 1 || !json.product) return null

  const p = json.product as OFFProduct
  return mapProduct(p, barcode)
}

export async function searchByText(query: string): Promise<FoodItem[]> {
  const encoded = encodeURIComponent(query)
  const res = await fetch(
    `${BASE_URL}/cgi/search.pl?search_terms=${encoded}&search_simple=1&action=process&json=1&page_size=10&fields=product_name,nutriments,code`
  )
  const json = await res.json()

  if (!json.products) return []

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
