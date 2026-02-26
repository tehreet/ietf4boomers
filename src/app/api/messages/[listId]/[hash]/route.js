import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { ietfFetch } from "@/lib/scraper";
import { getCached, setCached } from "@/lib/cache";

const CACHE_TTL = 86400000; // 24 hours

export async function GET(request, { params }) {
  const { listId, hash } = await params;
  const cacheKey = `msg:${listId}:${hash}`;
  const cached = getCached(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const res = await ietfFetch(`/arch/msg/${listId}/${hash}/`);
    const html = await res.text();
    const $ = cheerio.load(html);

    // Subject
    const subject = $("#msg-body h3").text().trim();

    // From: "Name <email>"
    const fromRaw = $("#msg-from").text().trim();
    const fromMatch = fromRaw.match(/^(.*?)\s*<(.+?)>$/);
    const from = fromMatch
      ? { name: fromMatch[1].trim(), email: fromMatch[2] }
      : { name: fromRaw, email: "" };

    // Date
    const date = $("#msg-date").text().trim();

    // Body
    const body = $(".msg-payload pre.wordwrap").text() || "";

    // Thread snippet
    const threadSnippet = [];
    $("ul.thread-snippet li").each((_, li) => {
      const $li = $(li);
      const depthMatch = $li.attr("class")?.match(/depth-(\d+)/);
      const depth = depthMatch ? parseInt(depthMatch[1]) : 0;
      const isCurrent = $li.hasClass("current-msg");
      const $a = $li.find("a");
      const href = $a.attr("href") || "";
      const parts = href.split("/").filter(Boolean);
      const msgHash = parts[parts.length - 1] || "";
      const linkText = $a.text().trim();

      // Author is the text after the link, separated by nbsp
      const fullText = $li.text();
      const authorPart = fullText.substring(fullText.indexOf(linkText) + linkText.length);
      const authorName = authorPart.replace(/[\u00a0\s]+/g, " ").trim();

      threadSnippet.push({
        hash: msgHash,
        subject: linkText,
        from: { name: authorName },
        depth,
        isCurrent,
      });
    });

    const result = { hash, subject, from, date, body, threadSnippet };

    setCached(cacheKey, result, CACHE_TTL);
    return NextResponse.json(result);
  } catch (err) {
    const status = err.message.includes("404") ? 404 : 502;
    return NextResponse.json({ error: err.message }, { status });
  }
}
