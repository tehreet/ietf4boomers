"use client";

export function ListSkeleton({ count = 8 }) {
  return Array.from({ length: count }, (_, i) => (
    <div key={i} className="list-item" style={{ opacity: 0.3, pointerEvents: "none" }}>
      <div
        className="list-item-icon"
        style={{ background: "var(--bg-tertiary)", color: "transparent" }}
      >
        ---
      </div>
      <div className="list-item-info">
        <div
          className="list-item-name"
          style={{
            background: "var(--bg-tertiary)",
            width: `${50 + (i * 13) % 40}%`,
            height: 13,
            borderRadius: 4,
          }}
        >
          &nbsp;
        </div>
        <div
          className="list-item-desc"
          style={{
            background: "var(--bg-tertiary)",
            width: `${60 + (i * 17) % 30}%`,
            height: 11,
            borderRadius: 4,
            marginTop: 4,
          }}
        >
          &nbsp;
        </div>
      </div>
    </div>
  ));
}

export function ThreadSkeleton({ count = 6 }) {
  return Array.from({ length: count }, (_, i) => (
    <div key={i} className="thread-item" style={{ opacity: 0.3, pointerEvents: "none" }}>
      <div
        className="thread-item-subject"
        style={{
          background: "var(--bg-tertiary)",
          height: 16,
          borderRadius: 4,
          width: `${60 + (i * 19) % 35}%`,
        }}
      >
        &nbsp;
      </div>
      <div className="thread-item-meta" style={{ marginTop: 8 }}>
        <span
          style={{
            background: "var(--bg-tertiary)",
            height: 11,
            borderRadius: 4,
            width: 80,
            display: "inline-block",
          }}
        >
          &nbsp;
        </span>
      </div>
    </div>
  ));
}

export function MessageSkeleton() {
  return (
    <div style={{ padding: "24px 32px", opacity: 0.3 }}>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="msg" style={{ marginBottom: 20 }}>
          <div className="msg-header" style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "var(--bg-tertiary)",
              }}
            />
            <div>
              <div
                style={{
                  background: "var(--bg-tertiary)",
                  height: 14,
                  width: 120,
                  borderRadius: 4,
                }}
              >
                &nbsp;
              </div>
              <div
                style={{
                  background: "var(--bg-tertiary)",
                  height: 11,
                  width: 180,
                  borderRadius: 4,
                  marginTop: 4,
                }}
              >
                &nbsp;
              </div>
            </div>
          </div>
          <div
            style={{
              background: "var(--bg-tertiary)",
              height: 60 + i * 20,
              borderRadius: 6,
              marginTop: 12,
            }}
          >
            &nbsp;
          </div>
        </div>
      ))}
    </div>
  );
}
