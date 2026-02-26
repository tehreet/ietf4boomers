import { Suspense } from "react";
import ArchiveReader from "@/components/ArchiveReader";

export default function Home() {
  return (
    <Suspense fallback={<div style={{ background: "#0C0E13", height: "100vh" }} />}>
      <ArchiveReader />
    </Suspense>
  );
}
