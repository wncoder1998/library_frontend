import fs from "node:fs";

const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
const diff = fs.readFileSync("pr.diff", "utf8").slice(0, 60000);

const response = await fetch("https://api.openai.com/v1/responses", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model,
    input: [
      {
        role: "system",
        content:
          "你是资深代码审查员和测试工程师。请根据 PR diff 输出两部分：1. 代码风险审查；2. 针对本次改动应补充的测试用例。测试用例要具体到场景、步骤和预期结果。请用中文输出。",
      },
      {
        role: "user",
        content: `请根据下面的 PR diff 生成测试用例建议：\n\n${diff}`,
      },
    ],
  }),
});

if (!response.ok) {
  const errorText = await response.text();
  throw new Error(`OpenAI API 请求失败：${errorText}`);
}

const data = await response.json();
const text = data.output_text ?? JSON.stringify(data, null, 2);

fs.writeFileSync("ai-review.md", `## AI 生成的测试用例建议\n\n${text}\n`);
