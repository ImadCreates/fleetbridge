import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { Location } from '../core/model'
import { ACCENT } from '../lib/palette'
import { formatTime } from '../lib/format'

const AXIS_TICK = {
  fontSize: 11,
  fill: '#94a3b8',
  fontFamily: 'ui-monospace, monospace',
}

export function SpeedChart({ locations }: { locations: Location[] }) {
  const data = locations.map((l) => ({
    time: formatTime(l.timestamp),
    speed: Math.round(l.speedKmh),
  }))
  const interval = Math.max(1, Math.floor(data.length / 6))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
        <CartesianGrid stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="time"
          interval={interval}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: '#e2e8f0' }}
        />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={40}
          allowDecimals={false}
        />
        <Tooltip
          formatter={(value) => [`${value} km/h`, 'Speed']}
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            fontFamily: 'ui-monospace, monospace',
          }}
          labelStyle={{ color: '#94a3b8' }}
        />
        <Line
          type="monotone"
          dataKey="speed"
          stroke={ACCENT}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
