import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTelegramBotLink,
  normalizeTelegramBotUsername,
} from "../src/lib/telegram/links.ts";

test("normalizeTelegramBotUsername accepts plain usernames and common variants", () => {
  assert.equal(normalizeTelegramBotUsername("KoiRaboti_bot"), "KoiRaboti_bot");
  assert.equal(normalizeTelegramBotUsername("@KoiRaboti_bot"), "KoiRaboti_bot");
  assert.equal(
    normalizeTelegramBotUsername("https://t.me/KoiRaboti_bot?start=abc123"),
    "KoiRaboti_bot",
  );
  assert.equal(
    normalizeTelegramBotUsername("telegram.me/KoiRaboti_bot"),
    "KoiRaboti_bot",
  );
});

test("normalizeTelegramBotUsername rejects non-Telegram urls and invalid usernames", () => {
  assert.equal(normalizeTelegramBotUsername("https://example.com/KoiRaboti_bot"), null);
  assert.equal(normalizeTelegramBotUsername("Koi Raboti"), null);
  assert.equal(normalizeTelegramBotUsername(""), null);
});

test("buildTelegramBotLink returns a canonical t.me deep link", () => {
  assert.equal(
    buildTelegramBotLink("@KoiRaboti_bot", "connect token"),
    "https://t.me/KoiRaboti_bot?start=connect+token",
  );
  assert.equal(
    buildTelegramBotLink("https://t.me/KoiRaboti_bot"),
    "https://t.me/KoiRaboti_bot",
  );
});
