import { Suspense } from "react";
import ArchiveReader from "@/components/ArchiveReader";

export default function Home() {
  return (
    <Suspense fallback={<div style={{ background: "var(--bg-deep)", height: "100vh" }} />}>
      <ArchiveReader />
    </Suspense>
  );
}
