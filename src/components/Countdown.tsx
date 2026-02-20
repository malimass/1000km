import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface CountdownProps {
  targetDate: string;
  className?: string;
}

export default function Countdown({ targetDate, className }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(targetDate));

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(getTimeLeft(targetDate)), 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  const units = [
    { label: "Giorni", value: timeLeft.days },
    { label: "Ore", value: timeLeft.hours },
    { label: "Min", value: timeLeft.minutes },
    { label: "Sec", value: timeLeft.seconds },
  ];

  return (
    <div className={className}>
      <p className="font-body text-sm uppercase tracking-widest text-primary-foreground/50 mb-3">
        Il cammino inizia tra
      </p>
      <div className="flex gap-3 justify-center">
        {units.map((u, i) => (
          <motion.div
            key={u.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 + i * 0.1 }}
            className="flex flex-col items-center min-w-[56px]"
          >
            <span className="font-heading text-2xl md:text-3xl font-bold text-accent tabular-nums">
              {String(u.value).padStart(2, "0")}
            </span>
            <span className="font-body text-[10px] uppercase tracking-wider text-primary-foreground/40">
              {u.label}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function getTimeLeft(target: string) {
  const diff = Math.max(0, new Date(target).getTime() - Date.now());
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}
