import React, { useMemo } from 'react'
import { View, StyleSheet } from 'react-native'
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg'

interface SimpleChartProps {
  data: number[]
  width: number
  height: number
  strokeColor?: string
  gradientFrom?: string
  gradientTo?: string
}

export function SimpleChart({
  data,
  width,
  height,
  strokeColor = '#7C3AED',
  gradientFrom = 'rgba(124,58,237,0.3)',
  gradientTo = 'rgba(124,58,237,0)',
}: SimpleChartProps) {
  const { linePath, areaPath } = useMemo(() => {
    if (!data.length) return { linePath: '', areaPath: '' }

    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const padding = 4

    const points = data.map((val, i) => ({
      x: padding + (i / (data.length - 1)) * (width - padding * 2),
      y: padding + (1 - (val - min) / range) * (height - padding * 2),
    }))

    // Build smooth cubic bezier path
    let line = `M ${points[0].x},${points[0].y}`
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const curr = points[i]
      const cpx = (prev.x + curr.x) / 2
      line += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`
    }

    // Close area path
    const lastPt = points[points.length - 1]
    const firstPt = points[0]
    const area = `${line} L ${lastPt.x},${height} L ${firstPt.x},${height} Z`

    return { linePath: line, areaPath: area }
  }, [data, width, height])

  if (!data.length) return null

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        <Defs>
          <SvgGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={gradientFrom} />
            <Stop offset="1" stopColor={gradientTo} />
          </SvgGradient>
          <SvgGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#7C3AED" />
            <Stop offset="0.5" stopColor="#3B82F6" />
            <Stop offset="1" stopColor="#06B6D4" />
          </SvgGradient>
        </Defs>
        <Path d={areaPath} fill="url(#chartGrad)" />
        <Path d={linePath} stroke="url(#lineGrad)" strokeWidth={2.5} fill="none" />
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
})
