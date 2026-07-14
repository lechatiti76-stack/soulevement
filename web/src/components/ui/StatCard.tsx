"use client";

import { motion } from "framer-motion";

export function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] p-5"
    >
      <div className="mb-3 text-2xl" aria-hidden>
        {icon}
      </div>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-sm text-[rgb(var(--text-muted))]">{label}</div>
    </motion.div>
  );
}
