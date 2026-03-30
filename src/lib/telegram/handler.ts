import { env } from "@/lib/env";
import { sendMessage, sendTypingAction } from "./api";
import {
  claimTelegramConnectToken,
  findOrCreateTelegramUser,
  getCategoriesForRestaurant,
  getRestaurantInfo,
  setDailySummaryEnabled,
} from "./data";
import { executeFunctionCall } from "./executor";
import { processMessage } from "./gemini";
import { downloadPhoto, uploadReceiptToStorage } from "./receipts";
import type { ExpenseCategory, TelegramMessage, TelegramUser } from "./types";

function buildAppProfileLink() {
  if (!env.appUrl) {
    return "";
  }

  return `\n\n<a href="${env.appUrl.replace(/\/$/, "")}/profile">Отвори приложението</a>`;
}

function buildLinkedWelcomeMessage(restaurantName: string) {
  return [
    `Свързан си с <b>${restaurantName}</b>.`,
    "Можеш да ми пращаш разходи, снимки на касови бележки и въпроси за бизнеса.",
    "",
    "Примери:",
    "• 48 лв зеленчуци",
    "• Покажи разходите за тази седмица",
    "• Как върви payroll този месец?",
    "",
    "Команди:",
    "/categories",
    "/summary",
    "/daily_on",
    "/daily_off",
    "/help",
  ].join("\n");
}

function buildUnlinkedMessage() {
  return (
    "Първо свържи Telegram с ресторанта си от KoiRaboti.\n" +
    "Отвори Профил > Telegram bot и натисни бутона за свързване." +
    buildAppProfileLink()
  );
}

async function runAiFlow(params: {
  chatId: number;
  text: string;
  user: TelegramUser;
  categories: ExpenseCategory[];
  restaurantName: string;
  message: TelegramMessage;
}) {
  await sendTypingAction(params.chatId);

  let imageBase64: string | undefined;
  let imageMimeType: string | undefined;
  let receiptImagePath: string | undefined;

  if (params.message.photo && params.message.photo.length > 0) {
    const largestPhoto = params.message.photo[params.message.photo.length - 1];
    const photoData = await downloadPhoto(largestPhoto.file_id);

    if (photoData) {
      imageBase64 = photoData.base64;
      imageMimeType = photoData.mimeType;
      receiptImagePath =
        (await uploadReceiptToStorage(
        params.user.restaurantId!,
        photoData.buffer,
        photoData.mimeType,
      )) ?? undefined;
    }
  }

  const geminiResponse = await processMessage({
    text: params.text,
    imageBase64,
    imageMimeType,
    restaurantName: params.restaurantName,
    categories: params.categories,
  });

  if (geminiResponse.type === "text") {
    await sendMessage(params.chatId, geminiResponse.text ?? "");
    return;
  }

  const results: string[] = [];
  for (const call of geminiResponse.functionCalls ?? []) {
    const result = await executeFunctionCall({
      call,
      restaurantId: params.user.restaurantId!,
      telegramUserId: params.user.id,
      categories: params.categories,
      receiptImagePath,
    });
    results.push(result.message);
  }

  await sendMessage(
    params.chatId,
    results.join("\n\n") || "Нямам достатъчно данни, за да помогна точно сега.",
  );
}

async function handleStartCommand(
  text: string,
  chatId: number,
  user: TelegramUser,
): Promise<boolean> {
  const token = text.split(/\s+/).slice(1).join(" ").trim();

  if (token) {
    if (user.restaurantId) {
      const restaurant = await getRestaurantInfo(user.restaurantId);
      await sendMessage(
        chatId,
        `Telegram вече е свързан с <b>${restaurant.name}</b>.\n\n${buildLinkedWelcomeMessage(restaurant.name)}`,
      );
      return true;
    }

    try {
      const claim = await claimTelegramConnectToken(token, user.id, chatId);
      await sendMessage(
        chatId,
        `Успешно свързах Telegram с <b>${claim.restaurantName}</b>.\n\n${buildLinkedWelcomeMessage(claim.restaurantName)}`,
      );
    } catch (error) {
      await sendMessage(
        chatId,
        `${error instanceof Error ? error.message : "Свързването не успя."}\n\n${buildUnlinkedMessage()}`,
      );
    }

    return true;
  }

  if (!user.restaurantId) {
    await sendMessage(chatId, buildUnlinkedMessage());
    return true;
  }

  const restaurant = await getRestaurantInfo(user.restaurantId);
  await sendMessage(chatId, buildLinkedWelcomeMessage(restaurant.name));
  return true;
}

async function handleCommand(
  text: string,
  chatId: number,
  user: TelegramUser,
): Promise<boolean> {
  const command = text.split(/\s+/)[0]?.toLowerCase() ?? "";

  switch (command) {
    case "/start":
      return handleStartCommand(text, chatId, user);
    case "/help":
      await sendMessage(
        chatId,
        [
          "Пиши ми свободно на български.",
          "",
          "Какво мога:",
          "• да записвам разходи",
          "• да обобщавам разходите по категории",
          "• да показвам днешния отчет",
          "• да давам attendance, payroll и KPI справки",
          "",
          "Примери:",
          "• 62 лв месо",
          "• Разходи за март",
          "• Дай ми KPI за този месец",
          "• Кои са отворените задачи?",
        ].join("\n"),
      );
      return true;
    case "/daily_on":
      if (!user.restaurantId) {
        await sendMessage(chatId, buildUnlinkedMessage());
        return true;
      }

      await setDailySummaryEnabled(user.id, true);
      await sendMessage(chatId, "Дневните Telegram обобщения са включени.");
      return true;
    case "/daily_off":
      if (!user.restaurantId) {
        await sendMessage(chatId, buildUnlinkedMessage());
        return true;
      }

      await setDailySummaryEnabled(user.id, false);
      await sendMessage(chatId, "Дневните Telegram обобщения са изключени.");
      return true;
    case "/categories":
    case "/summary":
      if (!user.restaurantId) {
        await sendMessage(chatId, buildUnlinkedMessage());
        return true;
      }
      return false;
    default:
      return false;
  }
}

export async function handleTelegramMessage(message: TelegramMessage): Promise<void> {
  const from = message.from;
  if (!from) {
    return;
  }

  const chatId = message.chat.id;
  const text = (message.text ?? message.caption ?? "").trim();

  try {
    const user = await findOrCreateTelegramUser(from, chatId);

    if (text.startsWith("/")) {
      const handled = await handleCommand(text, chatId, user);
      if (handled) {
        return;
      }
    }

    if (!user.restaurantId) {
      await sendMessage(chatId, buildUnlinkedMessage());
      return;
    }

    const [categories, restaurant] = await Promise.all([
      getCategoriesForRestaurant(user.restaurantId),
      getRestaurantInfo(user.restaurantId),
    ]);

    await runAiFlow({
      chatId,
      text,
      user,
      categories,
      restaurantName: restaurant.name,
      message,
    });
  } catch (error) {
    console.error("[Telegram Handler] Error:", error);
    await sendMessage(
      chatId,
      "Възникна грешка при обработката. Моля, опитай отново след малко.",
    );
  }
}
