/**
 * ============================================================
 *  StatCard Component
 * ============================================================
 *  A reusable glassmorphism stat card with icon, value, label,
 *  and optional animated accent glow.
 * ============================================================
 */
import { motion } from 'framer-motion';

export default function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="glass-card flex items-start gap-4 relative overflow-hidden"
    >
      {/* Background soft glow based on color */}
      <div 
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: color }}
      />
      
      <div
        className="flex items-center justify-center rounded-xl shrink-0 z-10"
        style={{
          width: 48,
          height: 48,
          background: `${color}18`,
          color: color,
        }}
      >
        <Icon size={24} />
      </div>

      <div className="flex flex-col z-10">
        <span
          className="text-2xl font-bold tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          {value}
        </span>
        <span
          className="text-sm font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
        </span>
        {sub && (
          <span className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {sub}
          </span>
        )}
      </div>
    </motion.div>
  );
}
