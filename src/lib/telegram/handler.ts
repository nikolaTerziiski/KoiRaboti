import { sendMessage, sendTypingAction } from "./api";
import { findOrCreateTelegramUser, createBusiness, getCategoriesForBusiness } from "./data";
import { processMessage } from "./gemini";
import { executeFunctionCall } from "./executor";
import { downloadPhoto } from "./receipts";
import type { TelegramMessage } from "./types";

/**
 * Main entry point for processing a Telegram message.
 * Handles onboarding, commands, and AI-powered expense tracking.
 */
export async function handleTelegramMessage(
  message: TelegramMessage,
): Promise<void> {
  const from = message.from;
  if (!from) return;

  const chatId = message.chat.id;
  const text = message.text ?? message.caption ?? "";

  try {
    // 1. Identify or create user
    const user = await findOrCreateTelegramUser(from);

    // 2. Handle commands first (before AI, to save latency/cost)
    if (text.startsWith("/")) {
      const handled = await handleCommand(text, chatId, user.id, user.businessId);
      if (handled) return;
    }

    // 3. Onboarding: no business yet
    if (!user.businessId) {
      await handleOnboarding(text, chatId, user.id);
      return;
    }

    // 4. Show typing indicator
    await sendTypingAction(chatId);

    // 5. Load context
    const categories = await getCategoriesForBusiness(user.businessId);

    // 6. Handle photo if present
    let imageBase64: string | undefined;
    let imageMimeType: string | undefined;
    if (message.photo && message.photo.length > 0) {
      // Pick highest resolution (last in array)
      const largestPhoto = message.photo[message.photo.length - 1];
      const photoData = await downloadPhoto(largestPhoto.file_id);
      if (photoData) {
        imageBase64 = photoData.base64;
        imageMimeType = photoData.mimeType;
      }
    }

    // 7. Fetch business name for system prompt
    const { getSupabaseAdminClient } = await import("@/lib/supabase/admin");
    const db = getSupabaseAdminClient();
    const { data: business } = await db
      .from("businesses")
      .select("name")
      .eq("id", user.businessId)
      .single();

    const businessName = business?.name ?? "Моят бизнес";

    // 8. Call Gemini
    const geminiResponse = await processMessage({
      text,
      imageBase64,
      imageMimeType,
      businessName,
      categories,
    });

    // 9. Handle response
    if (geminiResponse.type === "text") {
      await sendMessage(chatId, geminiResponse.text ?? "");
      return;
    }

    // 10. Execute function calls
    if (geminiResponse.functionCalls) {
      const results: string[] = [];
      for (const call of geminiResponse.functionCalls) {
        const result = await executeFunctionCall({
          call,
          businessId: user.businessId,
          telegramUserId: user.id,
          categories,
        });
        results.push(result.message);
      }
      await sendMessage(chatId, results.join("\n\n"));
    }
  } catch (error) {
    console.error("[Telegram Handler] Error:", error);
    await sendMessage(
      chatId,
      "Възникна грешка. Моля, опитай отново след малко.",
    );
  }
}

// ---------------------------------------------------------------------------
// Command handling
// ---------------------------------------------------------------------------

async function handleCommand(
  text: string,
  chatId: number,
  userId: string,
  businessId: string | null,
): Promise<boolean> {
  const command = text.split(" ")[0].toLowerCase();

  switch (command) {
    case "/start":
      if (businessId) {
        await sendMessage(
          chatId,
          "Здравей отново! Просто ми пиши разходите си — аз ще ги запиша.\n\n" +
            "Примери:\n" +
            '- "50 лв зеленчуци"\n' +
            '- "Гориво 30 евро"\n' +
            '- Изпрати снимка на касова бележка\n\n' +
            "Команди:\n" +
            "/categories — виж категориите\n" +
            "/summary — справка за месеца\n" +
            "/help — помощ",
        );
      } else {
        await sendMessage(
          chatId,
          "Здравей! Аз съм бот за проследяване на разходи.\n\n" +
            "За да започнеш, напиши името на бизнеса си:",
        );
      }
      return true;

    case "/help":
      await sendMessage(
        chatId,
        "Как да ме ползваш:\n\n" +
          "Просто ми пиши разходите — аз ще ги разбера и запиша.\n\n" +
          "Примери:\n" +
          '- "23 лв зеленчуци"\n' +
          '- "Гориво 50"\n' +
          '- "Платих 100 лв за ток"\n' +
          "- Изпрати снимка на касова бележка\n\n" +
          "Команди:\n" +
          "/categories — виж категориите\n" +
          "/summary — справка за месеца\n" +
          "/help — тази помощ",
      );
      return true;

    case "/categories":
      if (!businessId) {
        await sendMessage(chatId, "Първо създай бизнес. Напиши името му:");
        return true;
      }
      // Delegate to AI for consistent formatting
      return false;

    case "/summary":
      if (!businessId) {
        await sendMessage(chatId, "Първо създай бизнес. Напиши името му:");
        return true;
      }
      // Delegate to AI for consistent formatting
      return false;

    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Onboarding (no business yet)
// ---------------------------------------------------------------------------

async function handleOnboarding(
  text: string,
  chatId: number,
  userId: string,
): Promise<void> {
  const name = text.trim();

  if (!name || name.startsWith("/")) {
    await sendMessage(
      chatId,
      "Здравей! Аз съм бот за проследяване на разходи.\n\n" +
        "За да започнеш, напиши името на бизнеса си:",
    );
    return;
  }

  if (name.length < 2) {
    await sendMessage(chatId, "Името трябва да е поне 2 символа. Опитай пак:");
    return;
  }

  if (name.length > 100) {
    await sendMessage(chatId, "Името е прекалено дълго. Опитай с по-кратко:");
    return;
  }

  try {
    const business = await createBusiness(name, userId);
    await sendMessage(
      chatId,
      `Бизнес "${business.name}" е създаден!\n\n` +
        "Добавих стандартни категории разходи. Можеш да ги видиш с /categories\n\n" +
        "Сега просто ми пиши разходите — аз ще ги разбера и запиша.\n" +
        'Пример: "50 лв зеленчуци"',
    );
  } catch (error) {
    console.error("[Onboarding] Error creating business:", error);
    await sendMessage(chatId, "Възникна грешка. Моля, опитай отново.");
  }
}
