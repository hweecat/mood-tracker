'use client';

import { ThemeSelector } from './ThemeSelector';

export function SettingsView() {
  return (
    <div className="space-y-6">
      <section className="bg-card rounded-3xl p-6 border border-border shadow-sm">
        <ThemeSelector />
        {/* Future settings can be added here */}
      </section>
    </div>
  );
}
