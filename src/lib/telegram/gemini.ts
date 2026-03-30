import {
  GoogleGenerativeAI,
  type FunctionDeclaration,
  type Part,
  SchemaType,
} from "@google/generative-ai";
import { env } from "@/lib/env";
import type { ExpenseCategory } from "./types";

const functionDeclarations: FunctionDeclaration[] = [
  {
    name: "save_expense",
    description: "Записва нов разход за ресторанта",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        amount: {
          type: SchemaType.NUMBER,
          description: "Сума в оригиналната валута",
        },
        currency: {
          type: SchemaType.STRING,
          description: "Валута: BGN или EUR. По подразбиране BGN.",
        },
        category_name: {
          type: SchemaType.STRING,
          description: "Име на категория разход",
        },
        description: {
          type: SchemaType.STRING,
          description: "Кратко описание на разхода",
        },
        expense_date: {
          type: SchemaType.STRING,
          description: "Дата YYYY-MM-DD. Ако липсва, използвай днес.",
        },
      },
      required: ["amount", "category_name"],
    },
  },
  {
    name: "query_expenses",
    description: "Показва списък с разходи за период или категория",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        start_date: {
          type: SchemaType.STRING,
          description: "Начална дата YYYY-MM-DD",
        },
        end_date: {
          type: SchemaType.STRING,
          description: "Крайна дата YYYY-MM-DD",
        },
        category_name: {
          type: SchemaType.STRING,
          description: "Име на категория за филтър",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Максимален брой записи",
        },
      },
    },
  },
  {
    name: "get_expense_summary",
    description: "Дава обобщение на разходите по категории за период",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        start_date: {
          type: SchemaType.STRING,
          description: "Начална дата YYYY-MM-DD",
        },
        end_date: {
          type: SchemaType.STRING,
          description: "Крайна дата YYYY-MM-DD",
        },
      },
    },
  },
  {
    name: "list_categories",
    description: "Показва наличните категории разходи",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "add_category",
    description: "Добавя нова категория разход",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        name: {
          type: SchemaType.STRING,
          description: "Име на категорията",
        },
        emoji: {
          type: SchemaType.STRING,
          description: "Незадължително emoji",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "get_today_snapshot",
    description: "Връща кратка справка за днешния отчет",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "get_daily_report",
    description: "Връща дневен отчет за конкретна дата",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        work_date: {
          type: SchemaType.STRING,
          description: "Дата YYYY-MM-DD",
        },
      },
    },
  },
  {
    name: "get_attendance_summary",
    description: "Връща attendance справка за период",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        start_date: {
          type: SchemaType.STRING,
          description: "Начална дата YYYY-MM-DD",
        },
        end_date: {
          type: SchemaType.STRING,
          description: "Крайна дата YYYY-MM-DD",
        },
      },
    },
  },
  {
    name: "get_payroll_status",
    description: "Връща статус на payroll за месец и период",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        payroll_month: {
          type: SchemaType.STRING,
          description: "Месец като YYYY-MM-01",
        },
        payroll_period: {
          type: SchemaType.STRING,
          description: "first_half или second_half",
        },
      },
    },
  },
  {
    name: "get_month_kpis",
    description: "Връща KPI за месец",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        month_key: {
          type: SchemaType.STRING,
          description: "Месец като YYYY-MM-01",
        },
      },
    },
  },
  {
    name: "list_employees",
    description: "Показва списък със служители",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        active_only: {
          type: SchemaType.BOOLEAN,
          description: "Дали да се покажат само активните служители",
        },
      },
    },
  },
  {
    name: "get_open_actions",
    description: "Показва какво иска внимание днес",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "search_context",
    description: "Търси в неструктуриран контекст: бележки, OCR и описания",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description: "Какво да бъде потърсено",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Максимален брой резултати",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "set_daily_summary_enabled",
    description: "Включва или изключва дневните Telegram обобщения",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        enabled: {
          type: SchemaType.BOOLEAN,
          description: "true за включване, false за изключване",
        },
      },
      required: ["enabled"],
    },
  },
];

function buildSystemPrompt(
  restaurantName: string,
  categories: ExpenseCategory[],
): string {
  const today = new Date().toISOString().slice(0, 10);
  const categoryList = categories.length
    ? categories.map((category) => `- ${category.emoji ?? ""} ${category.name}`.trim()).join("\n")
    : "- Няма активни категории";

  return `Ти си Telegram ops copilot за ресторант "${restaurantName}".
Говориш на български и отговаряш кратко, ясно и делово.

Днешна дата: ${today}
Валута по подразбиране: BGN
Фиксиран курс: 1 EUR = 1.95583 BGN

Налични категории:
${categoryList}

Работен модел:
- За живи числа и структурирани данни винаги използвай tools.
- Не измисляй данни, стойности, служители или отчети.
- Ако потребителят съобщава разход, извикай save_expense.
- За справки за разходи използвай query_expenses или get_expense_summary.
- За въпроси за днес, attendance, payroll, KPI и служители използвай съответните tools.
- Използвай search_context само когато човекът иска повече детайли, бележки, OCR, причини или исторически контекст.
- Разрешени write действия са save_expense, add_category и set_daily_summary_enabled.
- Ако изпратят снимка на касова бележка, анализирай я и извлечи разхода.
- Ако категорията е неясна, избери най-близката само ако е достатъчно очевидно; иначе задай кратък уточняващ въпрос.
- Ако потребителят напише "/categories", използвай list_categories.
- Ако потребителят напише "/summary", използвай get_expense_summary за текущия месец.
- Ако потребителят иска да включи или изключи дневни обобщения, използвай set_daily_summary_enabled.

Тон:
- Български first.
- Без дълги уводи.
- След tool execution можеш да отговориш само с tool call, без излишен текст.`;
}

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
  restaurantName: string;
  categories: ExpenseCategory[];
}): Promise<GeminiResponse> {
  const genAI = new GoogleGenerativeAI(env.geminiApiKey);

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: buildSystemPrompt(params.restaurantName, params.categories),
    tools: [{ functionDeclarations }],
  });

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
    return {
      type: "text",
      text: "Не разбрах съобщението. Изпрати текст или снимка на касова бележка.",
    };
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

  const functionCalls: GeminiFunctionCall[] = [];
  let textResponse = "";

  for (const part of candidate.content.parts) {
    if (part.functionCall) {
      functionCalls.push({
        name: part.functionCall.name,
        args: (part.functionCall.args as Record<string, unknown>) ?? {},
      });
    }

    if (part.text) {
      textResponse += part.text;
    }
  }

  if (functionCalls.length > 0) {
    return { type: "function_calls", functionCalls };
  }

  return {
    type: "text",
    text: textResponse || "Не разбрах напълно заявката. Моля, опитай отново.",
  };
}
