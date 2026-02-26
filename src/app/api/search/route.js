import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { ietfFetch } from "@/lib/scraper";
import { getCached, setCached } from "@/lib/cache";

const CACHE_TTL = 120000; // 2 minutes

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const list = searchParams.get("list") || "";
  const page = searchParams.get("page") || "1";

  if (!q || !list) {
    return NextResponse.json({ results: [], query: q, hasMore: false });
  }

  const cacheKey = `search:${list}:${q}:${page}`;
  const cached = getCached(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const res = await ietfFetch(
      `/arch/browse/${list}/?q=${encodeURIComponent(q)}&page=${page}`
    );
    const html = await res.text();
    const $ = cheerio.load(html);

    const results = [];
    $(".xtbody .xtr").each((_, row) => {
      const $row = $(row);
      const subjCol = $row.find(".subj-col");
      const depthMatch = subjCol.attr("class")?.match(/depth-(\d+)/);
      const depth = depthMatch ? parseInt(depthMatch[1]) : 0;
      const href = subjCol.find("a.msg-detail").attr("href") || "";
      const hashParts = href.split("/").filter(Boolean);
      const hash = hashParts[hashParts.length - 1] || "";

      results.push({
        subject: subjCol.find("a.msg-detail").text().trim(),
        from: $row.find(".from-col").text().trim(),
        date: $row.find(".date-col").text().trim(),
        hash,
        list,
        threadId: $row.find(".thread-col").text().trim(),
        depth,
      });
    });

    // Check for pagination
    const hasMore = $(".pagination .next").length > 0 ||
      $('a:contains("Next")').length > 0;

    const result = { results, query: q, hasMore };

    setCached(cacheKey, result, CACHE_TTL);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err.message, results: [], query: q },
      { status: 502 }
    );
  }
}
