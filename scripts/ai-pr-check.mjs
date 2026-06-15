import fs from "node:fs";

const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
const chunkChars = Number(process.env.AI_REVIEW_CHUNK_CHARS || 12000);
const maxOutputTokens = Number(process.env.AI_REVIEW_MAX_OUTPUT_TOKENS || 1200);
const maxRetries = Number(process.env.AI_REVIEW_MAX_RETRIES || 2);
const retryDelayMs = Number(process.env.AI_REVIEW_RETRY_DELAY_MS || 65000);
const rawDiff = fs.readFileSync("pr.diff", "utf8");

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function splitLongText(text, maxChars) {
  const chunks = [];

  for (let index = 0; index < text.length; index += maxChars) {
    chunks.push(text.slice(index, index + maxChars));
  }

  return chunks;
}

function splitDiffIntoChunks(diff, maxChars) {
  if (!diff.trim()) {
    return [];
  }

  const fileSections = diff.split(/(?=^diff --git )/m).filter(Boolean);
  const chunks = [];
  let current = "";

  for (const section of fileSections) {
    if (section.length > maxChars) {
      if (current) {
        chunks.push(current);
        current = "";
      }

      chunks.push(...splitLongText(section, maxChars));
      continue;
    }

    if (current && current.length + section.length > maxChars) {
      chunks.push(current);
      current = section;
      continue;
    }

    current += section;
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function getResponseText(data) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }

  const outputText = data.output
    ?.flatMap((item) => item.content ?? [])
    .filter((content) => content.type === "output_text" && typeof content.text === "string")
    .map((content) => content.text)
    .join("\n\n");

  if (outputText?.trim()) {
    return outputText;
  }

  return [
    "未能从 OpenAI 响应中解析出文本内容。",
    "",
    "```json",
    JSON.stringify(data, null, 2),
    "```",
  ].join("\n");
}

async function requestReview(chunk, index, total) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_output_tokens: maxOutputTokens,
      input: [
        {
          role: "system",
          content:
            "你是资深代码审查员和测试工程师。请根据 PR diff 输出 Markdown 格式的中文报告，只输出 Markdown 正文，不要输出 JSON、元数据或代码块包裹全文。报告包含两部分：1. 代码风险审查；2. 针对本次改动应补充的测试用例。测试用例要具体到场景、步骤和预期结果。不要重复解释你的角色。",
        },
        {
          role: "user",
          content: [
            `这是完整 PR diff 的第 ${index + 1}/${total} 块。`,
            "请只审查这一块 diff，并输出该块对应的风险和测试用例。",
            "如果这一块没有实质风险或不需要测试，请明确写“未发现需要单独补充的测试用例”。",
            "",
            chunk,
          ].join("\n"),
        },
      ],
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data ? JSON.stringify(data, null, 2) : await response.text();
    const error = new Error(`OpenAI API 请求失败：${message}`);
    error.status = response.status;
    error.code = data?.error?.code;
    error.type = data?.error?.type;
    throw error;
  }

  return getResponseText(data);
}

async function requestReviewWithRetry(chunk, index, total) {
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await requestReview(chunk, index, total);
    } catch (error) {
      const isRateLimited = error.status === 429 || error.code === "rate_limit_exceeded";

      if (!isRateLimited || attempt === maxRetries) {
        throw error;
      }

      console.log(
        `第 ${index + 1}/${total} 块触发限流，${Math.round(retryDelayMs / 1000)} 秒后重试，第 ${
          attempt + 1
        }/${maxRetries} 次。`,
      );
      await sleep(retryDelayMs);
    }
  }

  throw new Error("重试流程异常结束。");
}

const chunks = splitDiffIntoChunks(rawDiff, chunkChars);

if (chunks.length === 0) {
  fs.writeFileSync("ai-review.md", "## AI 生成的测试用例建议\n\n本次 PR 没有检测到 diff 内容。\n");
  process.exit(0);
}

const reviews = [];

for (const [index, chunk] of chunks.entries()) {
  console.log(`正在审查第 ${index + 1}/${chunks.length} 块，字符数：${chunk.length}`);
  const review = await requestReviewWithRetry(chunk, index, chunks.length);
  reviews.push(`### 第 ${index + 1}/${chunks.length} 块\n\n${review}`);
}

fs.writeFileSync(
  "ai-review.md",
  [
    "## AI 生成的测试用例建议",
    "",
    `> 已审查完整 PR diff，共 ${rawDiff.length} 个字符，分为 ${chunks.length} 块处理。`,
    "",
    ...reviews,
    "",
  ].join("\n"),
);
