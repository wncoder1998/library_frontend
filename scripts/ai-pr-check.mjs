import fs from "node:fs";

const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
const maxDiffChars = Number(process.env.AI_REVIEW_MAX_DIFF_CHARS || 20000);
const maxOutputTokens = Number(process.env.AI_REVIEW_MAX_OUTPUT_TOKENS || 2500);
const rawDiff = fs.readFileSync("pr.diff", "utf8");
const diff = rawDiff.slice(0, maxDiffChars);
const diffNotice =
  rawDiff.length > maxDiffChars
    ? `\n\n注意：PR diff 过长，本次只分析前 ${maxDiffChars} 个字符。`
    : "";

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
          "你是资深代码审查员和测试工程师。请根据 PR diff 输出 Markdown 格式的中文报告，只输出 Markdown 正文，不要输出 JSON、元数据或代码块包裹全文。报告包含两部分：1. 代码风险审查；2. 针对本次改动应补充的测试用例。测试用例要具体到场景、步骤和预期结果。",
      },
      {
        role: "user",
        content: `请根据下面的 PR diff 生成测试用例建议。${diffNotice}\n\n${diff}`,
      },
    ],
  }),
});

if (!response.ok) {
  const errorText = await response.text();
  let error;

  try {
    error = JSON.parse(errorText).error;
  } catch {
    error = null;
  }

  if (response.status === 429 || error?.code === "rate_limit_exceeded") {
    fs.writeFileSync(
      "ai-review.md",
      [
        "## AI 生成的测试用例建议",
        "",
        "本次没有生成成功，因为 OpenAI API 触发了限流。",
        "",
        `- 模型：\`${model}\``,
        `- 限流类型：\`${error?.type || "rate_limit"}\``,
        `- 错误码：\`${error?.code || response.status}\``,
        "",
        "可以稍后重新运行 workflow，或者降低 `AI_REVIEW_MAX_DIFF_CHARS` / `AI_REVIEW_MAX_OUTPUT_TOKENS`。",
      ].join("\n"),
    );
    process.exit(0);
  }

  throw new Error(`OpenAI API 请求失败：${errorText}`);
}

const data = await response.json();
const text = getResponseText(data);

fs.writeFileSync("ai-review.md", `## AI 生成的测试用例建议\n\n${text}\n`);
