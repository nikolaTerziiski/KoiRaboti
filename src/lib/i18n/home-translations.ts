import type { Locale } from "./translations";

type HeroCardCopy = {
  eyebrow: string;
  title: string;
  value: string;
  description: string;
  meta: string;
};

type StoryMessage = {
  sender: "owner" | "bot";
  text: string;
};

type StoryPhoneState = {
  badge: string;
  title: string;
  messages: StoryMessage[];
  summaryLabel: string;
  summaryValue: string;
  summaryMeta: string;
};

type StoryScene = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  outcome: string;
  phone: StoryPhoneState;
};

type WorkflowStep = {
  title: string;
  description: string;
  meta: string;
};

type AudiencePanel = {
  title: string;
  description: string;
  bullets: string[];
};

type EvidenceItem = {
  title: string;
  description: string;
};

type ProofDialogStep = {
  title: string;
  description: string;
};

export type HomeTranslations = {
  hero: {
    badge: string;
    title: string;
    description: string;
    note: string;
    primaryCta: string;
    secondaryCta: string;
    bento: {
      attendance: HeroCardCopy;
      telegram: HeroCardCopy;
      payroll: HeroCardCopy;
    };
  };
  story: {
    eyebrow: string;
    title: string;
    description: string;
    scenes: StoryScene[];
  };
  workflow: {
    eyebrow: string;
    title: string;
    description: string;
    steps: WorkflowStep[];
  };
  audience: {
    eyebrow: string;
    title: string;
    description: string;
    owners: AudiencePanel;
    staff: AudiencePanel;
  };
  evidence: {
    eyebrow: string;
    title: string;
    items: {
      mobile: EvidenceItem;
      bilingual: EvidenceItem;
      separation: EvidenceItem;
      modes: EvidenceItem;
    };
  };
  proofDialog: {
    trigger: string;
    title: string;
    description: string;
    steps: ProofDialogStep[];
    outcome: string;
  };
  final: {
    eyebrow: string;
    title: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
  };
  footerDescription: string;
};

export const homeTranslations: Record<Locale, HomeTranslations> = {
  en: {
    hero: {
      badge: "Restaurant costs, finally under control",
      title: "Daily restaurant costs, attendance, and payroll in one place.",
      description:
        "Log receipts from Telegram, keep daily operations visible, and stop rebuilding the shift from memory after closing.",
      note: "Built for live work on a phone, while the day is still moving.",
      primaryCta: "Start free",
      secondaryCta: "See how it works (Demo)",
      bento: {
        attendance: {
          eyebrow: "Attendance",
          title: "The team is already marked for today",
          value: "18 wages ready to settle",
          description:
            "Who worked today is already connected to payroll later.",
          meta: "No extra sheet to reconcile",
        },
        telegram: {
          eyebrow: "Telegram expense",
          title: "The receipt is saved before it gets lost",
          value: "Fuel - BGN 36",
          description:
            "Photo, amount, and category stay tied to the right day.",
          meta: "Goes straight into today's expense total",
        },
        payroll: {
          eyebrow: "Payroll",
          title: "4 people need paying this week",
          value: "Advances are already accounted for",
          description:
            "You can see who is due and what is still outstanding without another spreadsheet.",
          meta: "The same data follows the whole flow",
        },
      },
    },
    story: {
      eyebrow: "What really happens",
      title: "You forget one fuel stop here, one supplier receipt there, and the month stops making sense.",
      description:
        "A normal day feels much calmer when the details are captured while they happen instead of being rebuilt at closing.",
      scenes: [
        {
          id: "fuel",
          eyebrow: "Fuel",
          title: "You top up fuel in a rush.",
          description:
            "You pay and move on. By the evening, nobody remembers the exact amount or where the receipt ended up.",
          outcome:
            "One Telegram message is enough to tie the expense to today.",
          phone: {
            badge: "Telegram expense",
            title: "Fuel is already logged",
            messages: [
              {
                sender: "owner",
                text: "Fuel for the delivery run, 36 lv.",
              },
              {
                sender: "bot",
                text: "Saved for today under Fuel. Add the receipt photo later if you need it.",
              },
            ],
            summaryLabel: "Added to today's report",
            summaryValue: "Fuel - BGN 36",
            summaryMeta: "It now appears in the day's total expenses",
          },
        },
        {
          id: "delivery",
          eyebrow: "Delivery",
          title: "The delivery arrives and the receipt gets left on the counter.",
          description:
            "Stock is coming in, people are moving around, and the receipt stays on the counter. If it is not captured quickly, half the context disappears later.",
          outcome:
            "The photo and note stay attached to the right day and the right category.",
          phone: {
            badge: "Receipt + category",
            title: "The supplier receipt is captured on time",
            messages: [
              {
                sender: "owner",
                text: "Uploading the fruit and veg receipt now.",
              },
              {
                sender: "bot",
                text: "Saved for today. OCR text and the Produce category were added.",
              },
            ],
            summaryLabel: "Categorized expense",
            summaryValue: "Delivery - Produce",
            summaryMeta: "Photo, OCR text, and description stay together",
          },
        },
        {
          id: "close",
          eyebrow: "Closing",
          title: "By closing time, what is missing is not just money. It is clarity.",
          description:
            "You still need to know what was spent, who worked, and how that feeds payroll. When it all gets rebuilt from memory, the picture drifts.",
          outcome:
            "You close the day with a clear picture instead of piecing it together later.",
          phone: {
            badge: "Daily summary",
            title: "You end the shift with a clean view",
            messages: [
              {
                sender: "owner",
                text: "/summary",
              },
              {
                sender: "bot",
                text: "Today: 3 expenses logged, attendance confirmed, and the day is ready for review.",
              },
            ],
            summaryLabel: "Today at a glance",
            summaryValue: "Expenses, attendance, and payroll context are aligned",
            summaryMeta: "Ready to review before close",
          },
        },
      ],
    },    workflow: {
      eyebrow: "How it works",
      title: "Set it up once. Then the day runs cleaner.",
      description:
        "The point is to stop gathering information at the end and start catching it while the work is happening.",
      steps: [
        {
          title: "Set up the restaurant",
          description:
            "Add your people, prepare the categories, and keep the core payroll setup ready from day one.",
          meta: "One time",
        },
        {
          title: "Log the day in motion",
          description:
            "Capture attendance, finance, and expenses from the phone while the shift is still fresh.",
          meta: "Every day",
        },
        {
          title: "Pay and review from the same data",
          description:
            "Use the same records for payroll windows, balances, and monthly visibility without rebuilding anything.",
          meta: "Each week and month",
        },
      ],
    },
    audience: {
      eyebrow: "Useful on both sides",
      title: "Less leakage for the owner. More clarity for the team.",
      description:
        "When the daily data is captured properly, both control and payroll conversations get easier.",
      owners: {
        title: "For owners",
        description:
          "You see where the money is going before the month surprises you.",
        bullets: [
          "Fewer forgotten expenses and fewer gaps between what was spent and what was reported.",
          "Attendance, expenses, and payroll context stay in one operating flow.",
          "You close the day with cleaner numbers and less manual follow-up later.",
        ],
      },
      staff: {
        title: "For staff",
        description:
          "The team sees what has been recorded and what payment is built on.",
        bullets: [
          "Attendance is easier to confirm and harder to dispute later.",
          "Rates, pay units, advances, and balances stay visible in the same workflow.",
          "Payroll decisions rely on cleaner records, not memory or chat history.",
        ],
      },
    },
    evidence: {
      eyebrow: "Already true in the product",
      title: "Nothing on the page needs marketing exaggeration to sound useful.",
      items: {
        mobile: {
          title: "Built for the phone",
          description:
            "Daily work is optimized for touch input during a live shift.",
        },
        bilingual: {
          title: "English and Bulgarian",
          description:
            "The app already supports both languages inside the product.",
        },
        separation: {
          title: "Each restaurant stays separate",
          description:
            "Data and access are structured per restaurant, not in one shared sheet.",
        },
        modes: {
          title: "Live and demo mode",
          description:
            "You can run the app with real data or use demo mode while setup is still happening.",
        },
      },
    },
    proofDialog: {
      trigger: "Open the forgotten fuel example",
      title: "A small missed cost becomes a proper same-day record",
      description:
        "This is exactly the kind of everyday operational gap the product is meant to close.",
      steps: [
        {
          title: "Send the amount right away",
          description:
            "A short Telegram message is enough while the moment is still fresh.",
        },
        {
          title: "Keep the context with it",
          description:
            "The category, receipt, and note stay attached to the right working day.",
        },
        {
          title: "See it later where it matters",
          description:
            "The expense appears inside the daily report you review before closing.",
        },
      ],
      outcome:
        "The gain is not only saving one number. It is keeping the whole day honest.",
    },
    final: {
      eyebrow: "Get the day under control",
      title: "Stop guessing where the money went after the shift ends.",
      description:
        "Create the account and keep expenses, attendance, and payroll context connected from day one.",
      primaryCta: "Start free",
      secondaryCta: "Sign in",
    },
    footerDescription:
      "KoiRaboti keeps daily expenses, attendance, and payroll in one working flow for restaurants.",
  },
  bg: {
    hero: {
      badge: "Край на хаоса с бележките",
      title: "Всички разходи на ресторанта, най-после на едно място.",
      description:
        "Снимай касовите бележки в Telegram. Управлявай графици и заплати без Excel. KoiRaboti подрежда деня ти, преди смяната да е приключила.",
      note: "Създадено за реална работа - през телефона, в движение.",
      primaryCta: "Започни безплатно",
      secondaryCta: "Виж как работи (Демо)",
      bento: {
        attendance: {
          eyebrow: "Присъствие",
          title: "Екипът е отчетен за деня",
          value: "18 надници за плащане",
          description:
            "Кой е бил на работа днес вече е подготвен за заплати.",
          meta: "Без отделни листове и сметки",
        },
        telegram: {
          eyebrow: "Разход в Telegram",
          title: "Бележката влиза в системата веднага",
          value: "Гориво - 36 лв.",
          description:
            "Снимка, сума и категория остават към точния ден.",
          meta: "Влиза директно в дневния разход",
        },
        payroll: {
          eyebrow: "Заплати",
          title: "4 души чакат плащане тази седмица",
          value: "Авансите са отчетени",
          description:
            "Виждаш кой какво има да получава, без втори Excel.",
          meta: "Едни и същи данни - от деня до заплатата",
        },
      },
    },
    story: {
      eyebrow: "Реалността в бизнеса",
      title: "Забравяш 50 лв. за гориво тук, 100 лв. за лед там... и месецът не излиза.",
      description:
        "Виж как един нормален ден се подрежда, докато още тече, вместо да го събираш вечер по спомен.",
      scenes: [
        {
          id: "fuel",
          eyebrow: "Гориво",
          title: "Зареждаш гориво в бързината.",
          description:
            "Плащаш и продължаваш. После вечерта вече никой не помни точната сума и къде е бележката.",
          outcome:
            "Едно съобщение в Telegram и разходът вече е вързан към днешния ден.",
          phone: {
            badge: "Telegram разход",
            title: "Горивото е записано",
            messages: [
              {
                sender: "owner",
                text: "Гориво за доставката, 36 лв.",
              },
              {
                sender: "bot",
                text: "Запазих го за днес в категория Гориво. Ако искаш, добави снимка на бележката след малко.",
              },
            ],
            summaryLabel: "Влезе в дневния отчет",
            summaryValue: "Гориво - 36 лв.",
            summaryMeta: "Вижда се в общия разход за деня",
          },
        },
        {
          id: "delivery",
          eyebrow: "Доставка",
          title: "Доставката идва, а бележката остава някъде на плота.",
          description:
            "Продукти идват, хора влизат и излизат, а бележката остава на плота. Ако не я хванеш веднага, после липсва половината информация.",
          outcome:
            "Снимката и кратката бележка остават към точния ден и точната категория.",
          phone: {
            badge: "Бележка + категория",
            title: "Бележката от доставката е хваната навреме",
            messages: [
              {
                sender: "owner",
                text: "Качвам бележката за плодове и зеленчуци.",
              },
              {
                sender: "bot",
                text: "Запазих я за днес. OCR текстът и категория Продукти са добавени.",
              },
            ],
            summaryLabel: "Категоризиран разход",
            summaryValue: "Доставка - Продукти",
            summaryMeta: "Снимката, OCR текстът и описанието остават заедно",
          },
        },
        {
          id: "close",
          eyebrow: "Край на деня",
          title: "Накрая липсват не само суми. Липсва ти и ясна картина.",
          description:
            "Трябва да знаеш какво е похарчено, кой е бил на работа и как това влиза в заплатите. Ако го събираш по спомен, започват разминаванията.",
          outcome:
            "Затваряш деня с ясна картина, вместо да сглобяваш всичко после.",
          phone: {
            badge: "Дневно обобщение",
            title: "Приключваш деня с ясна картина",
            messages: [
              {
                sender: "owner",
                text: "/summary",
              },
              {
                sender: "bot",
                text: "Днес: 3 разхода записани, присъствието е потвърдено и денят е готов за преглед.",
              },
            ],
            summaryLabel: "Днес накратко",
            summaryValue: "Разходи, присъствие и заплати са подредени",
            summaryMeta: "Готово за преглед преди затваряне",
          },
        },
      ],
    },    workflow: {
      eyebrow: "Как работи",
      title: "Настройваш веднъж. После денят просто върви по-лесно.",
      description:
        "Идеята е да спреш да събираш информация накрая и да я хващаш, докато се случва.",
      steps: [
        {
          title: "Настройваш ресторанта",
          description:
            "Добавяш хората, категориите за разходи и основните правила за плащане още в началото.",
          meta: "Веднъж",
        },
        {
          title: "Отчиташ деня в движение",
          description:
            "Въвеждаш присъствие, финанси и разходи от телефона, докато смяната още тече.",
          meta: "Всеки ден",
        },
        {
          title: "Плащаш и преглеждаш на същите данни",
          description:
            "Ползваш същата информация за заплати, баланси и месечен преглед, без ново сглобяване.",
          meta: "Всяка седмица и месец",
        },
      ],
    },
    audience: {
      eyebrow: "Полезно и за двете страни",
      title: "По-малко пропуски за собственика. Повече яснота за екипа.",
      description:
        "Когато данните са подредени навреме, и контролът, и разговорите за пари стават по-нормални.",
      owners: {
        title: "За собственика",
        description:
          "Виждаш къде изтичат пари, преди месецът да те изненада.",
        bullets: [
          "По-малко забравени разходи и по-малко разминаване между похарченото и отчета.",
          "Присъствие, разходи и контекст за заплати стоят в един поток.",
          "Денят приключва с по-чисти числа и по-малко ръчно събиране после.",
        ],
      },
      staff: {
        title: "За екипа",
        description:
          "Екипът знае кое е отчетено и върху какво стъпва плащането.",
        bullets: [
          "Присъствието се потвърждава по-лесно и по-трудно се оспорва после.",
          "Ставки, надници, аванси и баланси остават видими в същия поток.",
          "Решенията за заплати стъпват на ясни записи, а не на спомени и чатове.",
        ],
      },
    },
    evidence: {
      eyebrow: "Вече работи така",
      title: "Нищо на страницата не е измислено за маркетинга.",
      items: {
        mobile: {
          title: "Работи през телефона",
          description:
            "Дневният поток е направен за бързи действия по време на реална смяна.",
        },
        bilingual: {
          title: "BG и EN интерфейс",
          description:
            "Езикът се сменя вътре в продукта, без отделни версии.",
        },
        separation: {
          title: "Всеки ресторант е отделен",
          description:
            "Данните и достъпът са организирани по ресторант, не в една обща таблица.",
        },
        modes: {
          title: "Има и demo режим",
          description:
            "Можеш да пробваш продукта и преди да минеш изцяло на реални данни.",
        },
      },
    },
    proofDialog: {
      trigger: "Отвори примера със забравеното гориво",
      title: "Един изпуснат разход се превръща в подреден запис за деня",
      description:
        "Това е точно типът малка дупка в ежедневието, която KoiRaboti затваря.",
      steps: [
        {
          title: "Пращаш сумата веднага",
          description:
            "Кратко съобщение в Telegram стига, докато моментът още е пресен.",
        },
        {
          title: "Запазваш и контекста",
          description:
            "Категорията, бележката и снимката остават към точния работен ден.",
        },
        {
          title: "Виждаш го после там, където има значение",
          description:
            "Разходът влиза в дневния отчет, който така или иначе преглеждаш при затваряне.",
        },
      ],
      outcome:
        "Ползата не е само да спасиш една сума. Ползата е да не губиш цялата картина.",
    },
    final: {
      eyebrow: "Време е да подредиш деня",
      title: "Спрете да гадаете къде са отишли парите.",
      description:
        "Регистрирай ресторанта и събери разходи, присъствие и заплати на едно място още от първия ден.",
      primaryCta: "Започни безплатно",
      secondaryCta: "Вход",
    },
    footerDescription:
      "KoiRaboti събира ежедневните разходи, присъствието и заплатите в един работещ поток за ресторанта.",
  },
};
