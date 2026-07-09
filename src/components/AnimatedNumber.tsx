import { useEffect, useState } from 'react'

interface AnimatedNumberProps {
  value: number
  duration?: number
}

export default function AnimatedNumber({ value, duration = 1000 }: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let startTimestamp: number | null = null

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp
      const elapsed = timestamp - startTimestamp
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function: easeOutQuad
      const easeProgress = progress * (2 - progress)
      
      setDisplayValue(Math.floor(easeProgress * value))

      if (progress < 1) {
        window.requestAnimationFrame(step)
      }
    }

    window.requestAnimationFrame(step)
  }, [value, duration])

  return <>{displayValue}</>
}
