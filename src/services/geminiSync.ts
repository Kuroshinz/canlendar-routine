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
Hãy phân tích bữa ăn sau đây (từ hình ảnh hoặc mô tả văn bản) và trả về duy nhất một khối mã JSON hợp lệ (không kèm lời chào hay giải thích ngoài JSON) theo cấu trúc chính xác sau:

\`\`\`json
[
  {
    "slot": "breakfast",
    "name": "Tên món ăn (vd: Phở bò tái gầu)",
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
- Ước lượng thực tế theo chuẩn ẩm thực Việt Nam (Cơm tấm, phở, bún, thịt nạc, cơm trắng, đồ uống...).
`;

/**
 * Parses raw text from Gemini chat, markdown code blocks, or pure JSON into structured GeminiMacroItem array.
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
            kcal: Math.round(kcal),
            protein: Math.round(protein * 10) / 10,
            carbs: Math.round(carbs * 10) / 10,
            fat: Math.round(fat * 10) / 10,
          });
        }
      }

      if (validItems.length > 0) return validItems;
    } catch {
      // JSON parse failed, fall through to heuristic line-by-line parser
    }
  }

  // 2. Heuristic line-by-line parser:
  // e.g. "Phở bò: 450 kcal, 35g protein, 55g carb, 8g fat"
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const heuristicItems: GeminiMacroItem[] = [];

  for (const line of lines) {
    const cleanLine = line.replace(/^[-*•\d.]+\s*/, '');
    const kcalMatch = /(\d+(?:\.\d+)?)\s*(?:kcal|calo|calories)/i.exec(cleanLine);
    const pMatch = /(\d+(?:\.\d+)?)\s*g?\s*(?:protein|đạm|p\b)/i.exec(cleanLine);
    const cMatch = /(\d+(?:\.\d+)?)\s*g?\s*(?:carbs|carb|tinh bột|c\b)/i.exec(cleanLine);
    const fMatch = /(\d+(?:\.\d+)?)\s*g?\s*(?:fat|chất béo|mỡ|béo|f\b)/i.exec(cleanLine);

    if (kcalMatch || pMatch) {
      const colonIdx = cleanLine.indexOf(':');
      const name = colonIdx > 0 ? cleanLine.slice(0, colonIdx).trim() : cleanLine.split(/[,-]/)[0].trim();
      const kcal = kcalMatch ? Number(kcalMatch[1]) : 0;
      const protein = pMatch ? Number(pMatch[1]) : 0;
      const carbs = cMatch ? Number(cMatch[1]) : 0;
      const fat = fMatch ? Number(fMatch[1]) : 0;

      heuristicItems.push({
        slot: defaultSlot,
        name: name || 'Món ăn nhận diện',
        amount: 150,
        unit: 'g',
        kcal: Math.round(kcal || protein * 4 + carbs * 4 + fat * 9),
        protein: Math.round(protein * 10) / 10,
        carbs: Math.round(carbs * 10) / 10,
        fat: Math.round(fat * 10) / 10,
      });
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
 * Direct Gemini 1.5 Flash API call supporting text and food image.
 */
export async function callGeminiMacroApi(
  prompt: string,
  apiKey: string,
  imageBase64?: string,
  mimeType: string = 'image/jpeg',
  slot: MealSlot = 'lunch'
): Promise<GeminiSyncResult> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Vui lòng nhập Gemini API Key để thực hiện phân tích trực tiếp.');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`;

  const contents: any[] = [];
  const parts: any[] = [];

  if (imageBase64) {
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
    parts.push({
      inlineData: {
        mimeType,
        data: cleanBase64,
      },
    });
  }

  const userQuery = prompt.trim() || 'Hãy phân tích các món ăn trong hình này và tính toán chi tiết Calo, Protein, Carbs, Fat.';
  parts.push({
    text: `${GEMINI_NUTRITION_PROMPT_TEMPLATE}\n\nYêu cầu của người dùng:\n${userQuery}`,
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

