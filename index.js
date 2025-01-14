const { dummy } = require("./dummy");
const TextTranslationClient = require("@azure-rest/ai-translation-text").default;
const { isUnexpected } = require("@azure-rest/ai-translation-text");

require("dotenv").config()

const endpoint = process.env["ENDPOINT"];
const apiKey = process.env["APIKEY"];
const region = process.env["REGION"];

const translateCredential = {
  key: apiKey,
  region,
};

const translationClient = TextTranslationClient(endpoint, translateCredential);

const targetedLanguages = ["ja", "zh-Hans", "zh-Hant", "it", "th", "de"];
const languageMapping = {
  "zh-Hant": "tw",
  "zh-Hans": "zh",
  ja: "jp",
  th: "th",
  de: "de",
  it: "it",
};

const MAX_BATCH_SIZE = 25; 

async function translateBatch(inputTexts) {
  const translateResponse = await translationClient.path("/translate").post({
    body: inputTexts.map((text) => ({ text })),
    queryParameters: {
      to: targetedLanguages.join(","),
      from: "en",
    },
  });

  if (isUnexpected(translateResponse)) {
    throw new Error(translateResponse.body.error.message);
  }

  return translateResponse.body;
}

async function processTranslations(inputObject) {
  const inputKeys = Object.keys(inputObject);
  const inputTexts = inputKeys.map((key) => ({ key, text: inputObject[key] }));

  const output = {
    tw: {},
    zh: {},
    th: {},
    jp: {},
    de: {},
    it: {},
  };

  const batches = [];
  for (let i = 0; i < inputTexts.length; i += MAX_BATCH_SIZE) {
    batches.push(inputTexts.slice(i, i + MAX_BATCH_SIZE));
  }

  try {
    for (const batch of batches) {
      const translations = await translateBatch(batch.map((item) => item.text));

      translations.forEach((translation, index) => {
        const originalKey = batch[index].key;
        translation.translations.forEach(({ to, text }) => {
          const mappedLang = languageMapping[to];
          if (mappedLang) {
            output[mappedLang][originalKey] = text;
          }
        });
      });
    }

    return output
  } catch (error) {
    console.error("Translation failed:", error.message);
  }
}

(async () => {
  const result = await processTranslations(dummy);
  console.log(result)
})();

module.exports = { processTranslations };
