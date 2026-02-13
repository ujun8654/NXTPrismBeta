import { useI18n } from '../i18n';
import { motion } from 'framer-motion';

export default function Replay() {
  const { t } = useI18n();

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-auto">
      {/* Header */}
      <div>
        <h2 className="font-display text-sm font-semibold tracking-wider text-atc-white uppercase">
          {t('replay.title')}
        </h2>
        <p className="text-[11px] text-neutral-500 mt-0.5">{t('replay.desc')}</p>
      </div>

      {/* Replay Player */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex-1 glass-card rounded-lg flex flex-col"
      >
        {/* Controls */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
          <button className="px-3 py-1.5 text-[11px] font-medium text-atc-aqua glass-panel rounded-md hover:bg-white/5 transition-colors">
            ⏮ {t('replay.step')}
          </button>
          <button className="px-4 py-1.5 text-[11px] font-medium text-atc-white glass-panel rounded-md hover:bg-white/5 transition-colors glow-border-aqua">
            ▶ {t('replay.play')}
          </button>
          <button className="px-3 py-1.5 text-[11px] font-medium text-atc-aqua glass-panel rounded-md hover:bg-white/5 transition-colors">
            {t('replay.step')} ⏭
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button className="px-2.5 py-1 text-[10px] font-medium text-neutral-400 glass-panel rounded hover:text-atc-white transition-colors">
              {t('replay.asWas')}
            </button>
            <span className="text-neutral-700 text-[10px]">vs</span>
            <button className="px-2.5 py-1 text-[10px] font-medium text-neutral-400 glass-panel rounded hover:text-atc-white transition-colors">
              {t('replay.asIs')}
            </button>
          </div>
        </div>

        {/* Timeline */}
        <div className="px-4 py-3 border-b border-white/5">
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full w-0 bg-atc-aqua rounded-full transition-all" />
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl text-neutral-800 mb-3">▶</div>
            <p className="text-neutral-600 text-xs">{t('replay.noData')}</p>
            <p className="text-neutral-700 text-[10px] mt-1">
              Space = Play/Pause · J/K = Step
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
