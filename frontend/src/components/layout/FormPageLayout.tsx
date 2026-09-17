import React from 'react';
import Link from 'next/link';

interface FormPageLayoutProps {
  title: string | React.ReactNode;
  description: string | React.ReactNode;
  breadcrumbs: { label: string; href?: string }[];
  children: React.ReactNode;
  footer: React.ReactNode;
}

export function FormPageLayout({
  title,
  description,
  breadcrumbs,
  children,
  footer,
}: FormPageLayoutProps) {
  return (
    <div className="mx-auto w-full max-w-[860px] space-y-5 pb-20">
      <nav className="flex flex-wrap items-center gap-1.5 text-xs text-fx-text-muted">
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={`${crumb.label}-${index}`}>
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-[#2563EB] font-medium">
                {crumb.label}
              </Link>
            ) : (
              <span className="font-medium text-fx-text-secondary">{crumb.label}</span>
            )}
            {index < breadcrumbs.length - 1 && <span>/</span>}
          </React.Fragment>
        ))}
      </nav>

      <header className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-fx-text-primary">
          {title}
        </h1>
        <p className="text-sm text-fx-text-secondary">{description}</p>
      </header>

      <div className="space-y-5">{children}</div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-fx-border bg-white/95 backdrop-blur">
        <div className="lg:ml-[228px] px-4 sm:px-6 lg:px-7 py-3">
          <div className="mx-auto flex w-full max-w-[860px] items-center justify-end gap-2">
            {footer}
          </div>
        </div>
      </div>
    </div>
  );
}
