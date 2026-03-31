import { motion } from 'framer-motion'
import { Card, CardTitle, ScreenTitle, MetricCard, BarRow, TerminalLog } from '@/components/ui'

const MODELS=[
  {name:'Dense NN v2.4',arch:'128→256→256→128→64→1 · BatchNorm · Dropout(0.3)',loss:'0.0312',acc:'68.4%',status:'PROD',color:'#00ff9d'},
  {name:'LSTM v1.9',    arch:'2-layer LSTM hidden=128 · Sequence window: 50',  loss:'0.0441',acc:'61.2%',status:'PROD',color:'#00b8ff'},
  {name:'Dense NN v2.3',arch:'64→128→64→1 · Previous production version',      loss:'0.0387',acc:'65.1%',status:'ARCHIVE',color:'#3d6b52'},
]
const FEAT=[
  {label:'freq_90d',       value:0.312,pct:100,color:'#00ff9d'},
  {label:'positional_bias',value:0.241,pct:77, color:'#00c97a'},
  {label:'cooccur_entropy',value:0.187,pct:60, color:'#00b8ff'},
  {label:'recency_gap',    value:0.134,pct:43, color:'#ffb830'},
  {label:'freq_30d',       value:0.112,pct:36, color:'#7ab896'},
  {label:'trend_slope',    value:0.087,pct:28, color:'#7ab896'},
]
const EPOCHS=30
const trainL=Array.from({length:EPOCHS},(_,i)=>0.91*Math.exp(-i*0.08)+0.031)
const valL  =Array.from({length:EPOCHS},(_,i)=>0.93*Math.exp(-i*0.072)+0.034)
const maxL  =Math.max(...trainL,...valL)
const DRIFT=[
  {time:'06:00:04',tag:'[ OK ]',msg:'KL divergence: 0.041 — within bounds',  type:'ok'  as const},
  {time:'04:00:05',tag:'[WARN]',msg:'KL divergence: 0.073 — EXCEEDS 0.05',   type:'warn'as const},
  {time:'04:00:06',tag:'[INFO]',msg:'Auto-retrain triggered v2.3 → v2.4',    type:'info'as const},
  {time:'04:02:18',tag:'[ OK ]',msg:'v2.4 trained — val_loss: 0.0312 (↓)',   type:'ok'  as const},
  {time:'04:02:19',tag:'[ OK ]',msg:'v2.4 deployed to production registry',   type:'ok'  as const},
]

export function Models() {
  return (
    <div>
      <ScreenTitle>MODEL REGISTRY — MLFLOW EXPERIMENT TRACKING</ScreenTitle>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
        <MetricCard label="ACTIVE MODELS" value="2"      sub="In production"        delay={0}/>
        <MetricCard label="BEST VAL LOSS" value="0.0312" sub="Dense NN v2.4"        delay={0.05}/>
        <MetricCard label="LAST RETRAIN"  value="2h AGO" sub="Drift-triggered auto"  valueColor="text-rova-amber" delay={0.1} className="col-span-2 lg:col-span-1"/>
      </div>
      <Card delay={0.2} className="mb-3">
        <CardTitle>MODEL REGISTRY</CardTitle>
        {MODELS.map((m,i)=>(
          <motion.div key={m.name} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:0.3+i*0.08}}
            className="flex items-start sm:items-center gap-3 p-3 bg-rova-bg border border-rova-border rounded-sm mb-2 last:mb-0 flex-col sm:flex-row">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{background:m.color,boxShadow:`0 0 6px ${m.color}`}}/>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold text-rova-text mb-0.5">{m.name}</div>
              <div className="text-[9px] text-rova-text3 font-mono truncate">{m.arch}</div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right"><div className="text-[12px] font-bold font-mono" style={{color:m.color}}>{m.loss}</div><div className="text-[8px] text-rova-text4">VAL LOSS</div></div>
              <div className="text-right"><div className="text-[12px] font-bold font-mono" style={{color:m.color}}>{m.acc}</div><div className="text-[8px] text-rova-text4">ACCURACY</div></div>
              <div className="text-[8px] border rounded-sm px-2 py-1 font-mono" style={{color:m.color,borderColor:m.color+'44',background:m.color+'11'}}>{m.status}</div>
            </div>
          </motion.div>
        ))}
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 mb-3">
        <Card delay={0.35}>
          <CardTitle>TRAINING LOSS — DENSE NN v2.4 — 30 EPOCHS</CardTitle>
          <div className="flex items-end gap-px h-14 mt-2">
            {trainL.map((t,i)=>(
              <div key={i} className="flex flex-col items-center gap-px flex-1 h-full justify-end">
                <motion.div initial={{height:0}} animate={{height:`${(t/maxL)*52}px`}} transition={{duration:0.5,delay:0.4+i*0.02}} className="w-full rounded-sm opacity-80" style={{background:'#00ff9d',minHeight:1}}/>
                <motion.div initial={{height:0}} animate={{height:`${(valL[i]/maxL)*52}px`}} transition={{duration:0.5,delay:0.4+i*0.02}} className="w-full rounded-sm opacity-50" style={{background:'#ff4466',minHeight:1}}/>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-2 text-[8px]"><span className="text-rova-accent">▮ TRAIN</span><span className="text-rova-red">▮ VAL</span></div>
        </Card>
        <Card delay={0.4}>
          <CardTitle>FEATURE IMPORTANCE — TOP 6</CardTitle>
          {FEAT.map(f=><BarRow key={f.label} label={f.label} value={f.value.toFixed(3)} percent={f.pct} color={f.color}/>)}
        </Card>
      </div>
      <Card delay={0.45}>
        <CardTitle>DRIFT DETECTION LOG</CardTitle>
        <TerminalLog lines={DRIFT}/>
      </Card>
    </div>
  )
}
