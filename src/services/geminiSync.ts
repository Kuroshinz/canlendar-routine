/**
 * Gemini AI Macro Tracking & Synchronization Service for VortexCal.
 *
 * Supports:
 * 1. Direct Gemini API (Multimodal: Food photos + natural language text via Gemini 1.5 Flash).
 * 2. Ingestion parser for responses copied from Gemini Web / App / Chat.
 * 3. Pre-made prompt templates for fitness nutrition.
 */

import { FoodItem, MealLog, MealSlot } from '../types/productivity';

export interface GeminiMacroItem {
  slot: MealSlot;
  name: string;
  amount: number;
  unit: 'g' | 'ml';
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence?: number;
}

export interface GeminiSyncResult {
  items: GeminiMacroItem[];
  totalKcal: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  rawText?: string;
}

export const GEMINI_NUTRITION_PROMPT_TEMPLATE = `
Bạn là chuyên gia dinh dưỡng và phân tích khẩu phần thể hình chuyên sâu cho người Việt Nam.
Hãy phân tích bữa ăn sau đây từ mô tả văn bản và trả về duy nhất một khối mã JSON hợp lệ (không kèm lời chào hay giải thích ngoài JSON) theo cấu trúc chính xác sau:

\`\`\`json
[
  {
    "slot": "breakfast",
    "name": "Phở bò tái gầu",
    "amount": 550,
    "unit": "g",
    "kcal": 450,
    "protein": 34,
    "carbs": 56,
    "fat": 9
  }
]
\`\`\`

Quy ước:
- "slot" chỉ được là một trong 4 giá trị: "breakfast" (bữa sáng), "lunch" (bữa trưa), "dinner" (bữa tối), "snack" (bữa phụ).
- Ước lượng thực tế theo chuẩn ẩm thực Việt Nam (Cơm tấm, phở, bún, thịt nạc, cơm trắng, đồ uống, whey...).
`;

/**
 * Parses raw text from prompt, Gemini chat, markdown code blocks, tables, or natural syntax into structured GeminiMacroItem array.
 */
export function parseGeminiMacroResponse(rawText: string, defaultSlot: MealSlot = 'lunch'): GeminiMacroItem[] {
  if (!rawText || !rawText.trim()) return [];

  const text = rawText.trim();

  // 1. Try finding JSON within markdown code blocks ```json ... ``` or brackets [ ... ]
  let jsonString = '';
  const codeBlockMatch = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(text);
  if (codeBlockMatch) {
    jsonString = codeBlockMatch[1].trim();
  } else {
    const bracketMatch = /\[\s*\{[\s\S]*\}\s*\]/.exec(text);
    if (bracketMatch) {
      jsonString = bracketMatch[0].trim();
    } else {
      const singleObjMatch = /\{[\s\S]*"name"[\s\S]*\}/.exec(text);
      if (singleObjMatch) {
        jsonString = `[${singleObjMatch[0].trim()}]`;
      }
    }
  }

  if (jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      const validItems: GeminiMacroItem[] = [];

      for (const item of list) {
        if (!item || typeof item !== 'object') continue;
        const name = String(item.name || item.food || item.item || 'Món ăn').trim();
        const slot = parseMealSlot(item.slot || item.meal || defaultSlot);
        const amount = Number(item.amount || item.weight || item.quantity) || 150;
        const unit = item.unit === 'ml' ? 'ml' : 'g';
        const kcal = Number(item.kcal || item.calories || item.calorie) || 0;
        const protein = Number(item.protein || item.prot || item.p) || 0;
        const carbs = Number(item.carbs || item.carb || item.c) || 0;
        const fat = Number(item.fat || item.f) || 0;

        if (name && (kcal > 0 || protein > 0 || carbs > 0 || fat > 0)) {
          validItems.push({
            slot,
            name,
            amount: Math.round(amount),
            unit,
            kcal: Math.round(kcal || protein * 4 + carbs * 4 + fat * 9),
            protein: Math.round(protein * 10) / 10,
            carbs: Math.round(carbs * 10) / 10,
            fat: Math.round(fat * 10) / 10,
          });
        }
      }

      if (validItems.length > 0) return validItems;
    } catch {
      // JSON parse failed, fall through to line-by-line parser
    }
  }

  // 2. Smart line-by-line & structured prompt parser:
  // e.g. "Sáng: Phở bò: 450 kcal, 35g protein, 55g carb, 8g fat"
  // e.g. "Trưa: Cơm tấm sườn bì chả 650 kcal (40P / 75C / 20F)"
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const heuristicItems: GeminiMacroItem[] = [];

  for (const line of lines) {
    // Ignore markdown table header separators like |---|---|
    if (/^\|?[-:\s|]+\|?$/.test(line)) continue;

    let cleanLine = line.replace(/^[-*•\d.]+\s*/, '').replace(/^\|\s*/, '').replace(/\s*\|$/, '');

    // Check if line specifies a meal slot prefix (e.g., "Sáng:", "Bữa trưa:", "Dinner -")
    let itemSlot = defaultSlot;
    const slotPrefixMatch = /^(?:bữa\s+)?(sáng|trưa|tối|phụ|breakfast|lunch|dinner|snack)\s*[:\-–]\s*(.*)$/i.exec(cleanLine);
    if (slotPrefixMatch) {
      itemSlot = parseMealSlot(slotPrefixMatch[1]);
      cleanLine = slotPrefixMatch[2].trim();
    }

    const kcalMatch = /(\d+(?:\.\d+)?)\s*(?:kcal|calo|calories)/i.exec(cleanLine);
    const pMatch = /(\d+(?:\.\d+)?)\s*g?\s*(?:protein|đạm|p\b)/i.exec(cleanLine);
    const cMatch = /(\d+(?:\.\d+)?)\s*g?\s*(?:carbs|carb|tinh bột|c\b)/i.exec(cleanLine);
    const fMatch = /(\d+(?:\.\d+)?)\s*g?\s*(?:fat|chất béo|mỡ|béo|f\b)/i.exec(cleanLine);

    if (kcalMatch || pMatch || cMatch || fMatch) {
      // Extract clean name by stripping macro numbers and parentheses
      let namePart = cleanLine
        .replace(/\(.*?\)/g, '')
        .replace(/\[.*?\]/g, '')
        .split(/[:|]/)[0]
        .replace(/(\d+(?:\.\d+)?)\s*(?:kcal|calo|calories|protein|đạm|p|carbs|carb|tinh bột|c|fat|chất béo|béo|f)\b.*/i, '')
        .trim();

      if (!namePart || namePart.length < 2) {
        namePart = cleanLine.split(/[,-]/)[0].trim();
      }

      const kcal = kcalMatch ? Number(kcalMatch[1]) : 0;
      const protein = pMatch ? Number(pMatch[1]) : 0;
      const carbs = cMatch ? Number(cMatch[1]) : 0;
      const fat = fMatch ? Number(fMatch[1]) : 0;

      const calcKcal = kcal > 0 ? kcal : Math.round(protein * 4 + carbs * 4 + fat * 9);

      if (namePart && (calcKcal > 0 || protein > 0 || carbs > 0 || fat > 0)) {
        heuristicItems.push({
          slot: itemSlot,
          name: namePart.replace(/^[-*•:\s]+/, '').trim() || 'Món ăn',
          amount: 150,
          unit: 'g',
          kcal: calcKcal,
          protein: Math.round(protein * 10) / 10,
          carbs: Math.round(carbs * 10) / 10,
          fat: Math.round(fat * 10) / 10,
        });
      }
    }
  }

  return heuristicItems;
}

function parseMealSlot(val: string): MealSlot {
  const lower = String(val).toLowerCase();
  if (lower.includes('break') || lower.includes('sáng')) return 'breakfast';
  if (lower.includes('lunch') || lower.includes('trưa')) return 'lunch';
  if (lower.includes('din') || lower.includes('tối')) return 'dinner';
  return 'snack';
}

/**
 * Direct text-only prompt Gemini 1.5 Flash API call.
 */
export async function callGeminiMacroApi(
  prompt: string,
  apiKey: string,
  slot: MealSlot = 'lunch'
): Promise<GeminiSyncResult> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Vui lòng nhập Gemini API Key để thực hiện phân tích prompt trực tiếp.');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`;

  const contents: any[] = [];
  const parts: any[] = [];

  const userQuery = prompt.trim() || 'Hãy phân tích các món ăn sau đây và tính toán chi tiết Calo, Protein, Carbs, Fat.';
  parts.push({
    text: `${GEMINI_NUTRITION_PROMPT_TEMPLATE}\n\nYêu cầu phân tích bữa ăn:\n${userQuery}`,
  });

  contents.push({ parts });

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Lỗi từ Gemini API (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const items = parseGeminiMacroResponse(rawText, slot);

  const totalKcal = items.reduce((sum, it) => sum + it.kcal, 0);
  const totalProtein = Math.round(items.reduce((sum, it) => sum + it.protein, 0) * 10) / 10;
  const totalCarbs = Math.round(items.reduce((sum, it) => sum + it.carbs, 0) * 10) / 10;
  const totalFat = Math.round(items.reduce((sum, it) => sum + it.fat, 0) * 10) / 10;

  return {
    items,
    totalKcal,
    totalProtein,
    totalCarbs,
    totalFat,
    rawText,
  };
}

