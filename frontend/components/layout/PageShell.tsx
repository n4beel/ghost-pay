"use client";

import Sidebar from "./Sidebar";

interface PageShellProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export default function PageShell({ children, title, description }: PageShellProps) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-base)" }}>
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {(title || description) && (
          <header
            className="flex-shrink-0 px-8 py-6"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
          >
            {title && (
              <h1
                className="text-[20px] font-semibold tracking-[-0.01em]"
                style={{ color: "var(--text-primary)" }}
              >
                {title}
              </h1>
            )}
            {description && (
              <p className="mt-1 text-[13px]" style={{ color: "var(--text-secondary)" }}>
                {description}
              </p>
            )}
          </header>
        )}
        <div className="flex-1 p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
