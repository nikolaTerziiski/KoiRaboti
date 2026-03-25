import {
  GoogleGenerativeAI,
  type FunctionDeclaration,
  SchemaType,
  type Part,
} from "@google/generative-ai";
import { env } from "@/lib/env";
import type { ExpenseCategory } from "./types";

// ---------------------------------------------------------------------------
// Function declarations (tools Gemini can call)
// ---------------------------------------------------------------------------

const functionDeclarations: FunctionDeclaration[] = [
  {
    name: "save_expense",
    description: "Save a new expense record",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        amount: {
          type: SchemaType.NUMBER,
          description: "Amount in the original currency",
        },
        currency: {
          type: SchemaType.STRING,
          description: "Currency of the amount: BGN or EUR. Default BGN.",
        },
        category_name: {
          type: SchemaType.STRING,
          description:
            "Expense category name. Must match one of the available categories.",
        },
        description: {
          type: SchemaType.STRING,
          description: "Brief description of the expense",
        },
        expense_date: {
          type: SchemaType.STRING,
          description:
            "Date of expense in YYYY-MM-DD format. Defaults to today.",
        },
      },
      required: ["amount", "category_name"],
    },
  },
  {
    name: "query_expenses",
    description:
      "Query and list recent expenses, optionally filtered by date range or category",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        start_date: {
          type: SchemaType.STRING,
          description: "Start date YYYY-MM-DD",
        },
        end_date: {
          type: SchemaType.STRING,
          description: "End date YYYY-MM-DD",
        },
        category_name: {
          type: SchemaType.STRING,
          description: "Filter by category name",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Max number of results, default 10",
        },
      },
    },
  },
  {
    name: "get_expense_summary",
    description:
      "Get a summary of expenses grouped by category for a date range",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        start_date: {
          type: SchemaType.STRING,
          description:
            "Start date YYYY-MM-DD. Defaults to first day of current month.",
        },
        end_date: {
          type: SchemaType.STRING,
          description: "End date YYYY-MM-DD. Defaults to today.",
        },
      },
    },
  },
  {
    name: "list_categories",
    description: "List all available expense categories for this business",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "add_category",
    description: "Add a new expense category",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        name: {
          type: SchemaType.STRING,
          description: "Category name",
        },
        emoji: {
          type: SchemaType.STRING,
          description: "Optional emoji for the category",
        },
      },
      required: ["name"],
    },
  },
];

// ---------------------------------------------------------------------------
// System prompt builder
// ---------------------------------------------------------------------------

function buildSystemPrompt(
  businessName: string,
  categories: ExpenseCategory[],
): string {
  const today = new Date().toISOString().slice(0, 10);
  const categoryList = categories
    .map((c) => `- ${c.emoji ?? ""} ${c.name}`)
    .join("\n");

  return `Ти си счетоводен асистент за бизнес "${businessName}".
Говориш на български. Отговаряй кратко и точно.

Налични категории разходи:
${categoryList}

Днешна дата: ${today}
Валута по подразбиране: BGN
Фиксиран курс: 1 EUR = 1.95583 BGN

Правила:
- Когато потребителят спомене разход, извлечи сумата, категорията и описанието и извикай save_expense.
- Ако сумата е в лева (лв, лева, BGN), запиши currency: "BGN". Ако е в евро (EUR, евро), запиши currency: "EUR".
- Ако не е уточнена валута, приеми BGN.
- Ако категорията не съществува точно, избери най-близката от списъка.
- Ако не си сигурен за категорията, попитай потребителя.
- Ако потребителят изпрати снимка на касова бележка, анализирай я и извлечи разходите.
- При неясен текст, помоли за уточнение.
- При въпроси за разходите ползвай query_expenses или get_expense_summary.
- Не измисляй данни — ако нямаш информация, кажи го.`;
}

// ---------------------------------------------------------------------------
// Process message
// ---------------------------------------------------------------------------

export interface GeminiFunctionCall {
  name: string;
  args: Record<string, unknown>;
}

export interface GeminiResponse {
  type: "function_calls" | "text";
  functionCalls?: GeminiFunctionCall[];
  text?: string;
}

export async function processMessage(params: {
  text: string;
  imageBase64?: string;
  imageMimeType?: string;
  businessName: string;
  categories: ExpenseCategory[];
}): Promise<GeminiResponse> {
  const genAI = new GoogleGenerativeAI(env.geminiApiKey);

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: buildSystemPrompt(
      params.businessName,
      params.categories,
    ),
    tools: [{ functionDeclarations }],
  });

  // Build message parts
  const parts: Part[] = [];

  if (params.imageBase64 && params.imageMimeType) {
    parts.push({
      inlineData: {
        mimeType: params.imageMimeType,
        data: params.imageBase64,
      },
    });
  }

  if (params.text) {
    parts.push({ text: params.text });
  }

  if (parts.length === 0) {
    return { type: "text", text: "Не разбрах. Моля, изпрати текст или снимка." };
  }

  const result = await model.generateContent(parts);
  const response = result.response;
  const candidate = response.candidates?.[0];

  if (!candidate?.content?.parts) {
    return {
      type: "text",
      text: "Не успях да обработя заявката. Моля, опитай пак.",
    };
  }

  // Check for function calls
  const fnCalls: GeminiFunctionCall[] = [];
  let textResponse = "";

  for (const part of candidate.content.parts) {
    if (part.functionCall) {
      fnCalls.push({
        name: part.functionCall.name,
        args: (part.functionCall.args as Record<string, unknown>) ?? {},
      });
    }
    if (part.text) {
      textResponse += part.text;
    }
  }

  if (fnCalls.length > 0) {
    return { type: "function_calls", functionCalls: fnCalls };
  }

  return { type: "text", text: textResponse || "Не разбрах. Моля, опитай пак." };
}
