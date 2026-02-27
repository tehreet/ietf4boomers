import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { ietfFetch } from "@/lib/scraper";
import { getCached, setCached } from "@/lib/cache";

const CACHE_TTL = 300000; // 5 minutes

function parseMessageRows($) {
  const messages = [];
  $(".xtbody .xtr").each((_, row) => {
    const $row = $(row);
    const subjCol = $row.find(".subj-col");
    const depthMatch = subjCol.attr("class")?.match(/depth-(\d+)/);
    const depth = depthMatch ? parseInt(depthMatch[1]) : 0;
    const href = subjCol.find("a.msg-detail").attr("href") || "";
    const hashParts = href.split("/").filter(Boolean);
    const hash = hashParts[hashParts.length - 1] || "";

    messages.push({
      subject: subjCol.find("a.msg-detail").text().trim(),
      hash,
      from: $row.find(".from-col").text().trim(),
      date: $row.find(".date-col").text().trim(),
      threadId: $row.find(".thread-col").text().trim(),
      depth,
    });
  });
  return messages;
}

function groupIntoThreads(messages, listId) {
  const threadMap = new Map();
  for (const msg of messages) {
    const tid = msg.threadId || msg.hash;
    if (!threadMap.has(tid)) threadMap.set(tid, []);
    threadMap.get(tid).push(msg);
  }

  const threads = [];
  for (const [threadId, msgs] of threadMap) {
    const root = msgs.reduce((a, b) => {
      if (a.depth < b.depth) return a;
      if (a.depth > b.depth) return b;
      return a.date <= b.date ? a : b;
    });

    msgs.sort((a, b) => a.date.localeCompare(b.date));

    threads.push({
      id: threadId,
      subject: root.subject.replace(/^\[[\w-]+\]\s*/, ""),
      from: { name: root.from },
      date: root.date,
      lastActivity: msgs[msgs.length - 1].date,
      replyCount: msgs.length - 1,
      hot: msgs.length > 10,
      list: listId,
      rootHash: root.hash,
      messages: msgs.map((m) => ({
        hash: m.hash,
        subject: m.subject,
        from: { name: m.from },
        date: m.date,
        depth: m.depth,
      })),
    });
  }

  threads.sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
  return threads;
}

export async function GET(request, { params }) {
  const { listId } = await params;
  const { searchParams } = new URL(request.url);
  const qdr = searchParams.get("qdr") || "";

  const cacheKey = `threads:${listId}:${qdr}`;
  const cached = getCached(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const qdrParam = qdr ? `&qdr=${qdr}` : "";

    // Fetch both views in parallel:
    // - Chronological (no gbt): 2 pages for the very latest messages
    // - Grouped by thread (gbt=1): 3 pages for broader thread discovery
    // This avoids gbt's problem where one huge thread fills a whole page
    // and pushes recent threads to later pages.
    const fetches = await Promise.allSettled([
      ietfFetch(`/arch/browse/${listId}/${qdrParam ? "?" + qdrParam.slice(1) : ""}`),
      ietfFetch(`/arch/browse/${listId}/?page=2${qdrParam}`),
      ietfFetch(`/arch/browse/${listId}/?gbt=1${qdrParam}`),
      ietfFetch(`/arch/browse/${listId}/?gbt=1${qdrParam}&page=2`),
      ietfFetch(`/arch/browse/${listId}/?gbt=1${qdrParam}&page=3`),
    ]);

    // Deduplicate messages by hash across all pages
    const seenHashes = new Set();
    let allMessages = [];

    for (const result of fetches) {
      if (result.status === "fulfilled") {
        const html = await result.value.text();
        const $ = cheerio.load(html);
        for (const msg of parseMessageRows($)) {
          if (msg.hash && !seenHashes.has(msg.hash)) {
            seenHashes.add(msg.hash);
            allMessages.push(msg);
          }
        }
      }
    }

    if (allMessages.length === 0) {
      return NextResponse.json({ threads: [], hasMore: false });
    }

    const threads = groupIntoThreads(allMessages, listId);
    const result = { threads, hasMore: true };

    setCached(cacheKey, result, CACHE_TTL);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err.message, threads: [] },
      { status: 502 }
    );
  }
}
