import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'

export function Card({ children, className, glow, delay = 0 }: { children: ReactNode; className?: string; glow?: boolean; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay }}
      className={clsx('relative bg-rova-bg1 border border-rova-border rounded-sm overflow-hidden p-3 sm:p-4', glow && 'border-rova-border2', className)}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-rova-accent2/25 to-transparent" />
      {children}
    </motion.div>
  )
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <div className="text-[8px] sm:text-[9px] tracking-[2px] text-rova-text3 mb-2 sm:mb-3 uppercase font-mono">{children}</div>
}

export function ScreenTitle({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4 text-[8px] sm:text-[9px] tracking-[2.5px] text-rova-text3 uppercase">
      <span className="text-rova-accent font-bold">&gt;</span>
      <span className="truncate">{children}</span>
      <div className="flex-1 h-px bg-rova-border min-w-0" />
    </div>
  )
}

export function MetricCard({ label, value, sub, delta, positive, valueColor, tag, tagColor = 'green', delay = 0 }: {
  label: string; value: string | number; sub?: string; delta?: string; positive?: boolean;
  valueColor?: string; tag?: string; tagColor?: 'green'|'red'|'amber'|'blue'; delay?: number
}) {
  const tc: Record<string,string> = { green:'text-rova-accent border-rova-accent/30 bg-rova-accent/5', red:'text-rova-red border-rova-red/30 bg-rova-red/5', amber:'text-rova-amber border-rova-amber/30 bg-rova-amber/5', blue:'text-rova-blue border-rova-blue/30 bg-rova-blue/5' }
  return (
    <Card delay={delay}>
      <CardTitle>{label}</CardTitle>
      <div className={clsx('text-2xl sm:text-3xl font-bold font-mono', valueColor ?? 'text-rova-accent')}>{value}</div>
      {sub   && <div className="text-[9px] text-rova-text3 mt-1">{sub}</div>}
      {delta && <div className={clsx('text-[9px] mt-1.5 font-mono', positive ? 'text-rova-accent' : 'text-rova-red')}>{delta}</div>}
      {tag   && <span className={clsx('inline-block text-[8px] tracking-[1px] border px-1.5 py-0.5 rounded-sm mt-2', tc[tagColor])}>{tag}</span>}
    </Card>
  )
}

export function BarRow({ label, value, percent, color = '#00ff9d' }: { label: string; value: string | number; percent: number; color?: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-16 sm:w-20 text-[9px] text-rova-text3 truncate shrink-0">{label}</div>
      <div className="flex-1 bg-rova-border rounded-full overflow-hidden" style={{ height: '3px' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(percent, 100)}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} className="h-full rounded-full" style={{ background: color }} />
      </div>
      <div className="w-10 text-right text-[9px] text-rova-text2 shrink-0">{value}</div>
    </div>
  )
}

type BallType = 'main'|'hot'|'warm'|'bonus'|'cold'
const BC: Record<BallType,string> = { main:'bg-rova-accent/12 text-rova-accent border-rova-accent/40', hot:'bg-rova-red/12 text-rova-red border-rova-red/40', warm:'bg-rova-amber/12 text-rova-amber border-rova-amber/40', bonus:'bg-rova-blue/12 text-rova-blue border-rova-blue/40', cold:'bg-white/5 text-rova-text3 border-rova-text3/20' }
export function Ball({ number, type = 'main', size = 'md' }: { number: number; type?: BallType; size?: 'sm'|'md'|'lg' }) {
  const sz = { sm:'w-7 h-7 text-[9px]', md:'w-9 h-9 text-[11px]', lg:'w-11 h-11 text-sm' }
  return <motion.span whileHover={{ scale: 1.12 }} className={clsx('inline-flex items-center justify-center rounded-full font-bold border font-mono cursor-pointer select-none', sz[size], BC[type])}>{number}</motion.span>
}

export function Spinner() {
  return <span className="inline-block w-3 h-3 rounded-full border border-rova-border2 border-t-rova-accent animate-spin-r" />
}

export function TerminalLog({ lines }: { lines: { time: string; tag: string; msg: string; type: 'ok'|'info'|'warn'|'err' }[] }) {
  const clr = { ok:'text-rova-accent', info:'text-rova-blue', warn:'text-rova-amber', err:'text-rova-red' }
  return (
    <div className="bg-rova-bg border border-rova-border rounded-sm p-2 sm:p-3 text-[8px] sm:text-[9px] leading-6 max-h-36 overflow-y-auto font-mono">
      {lines.map((l, i) => (
        <div key={i} className="flex gap-2 flex-wrap sm:flex-nowrap">
          <span className="text-rova-text4 shrink-0">{l.time}</span>
          <span className={clsx('shrink-0 min-w-[42px]', clr[l.type])}>{l.tag}</span>
          <span className="text-rova-text2 break-all">{l.msg}</span>
        </div>
      ))}
    </div>
  )
}
