import React from 'react'
import Card from './Card'

export default function ChartWidget({ title, data, type = 'line', className = '' }) {
  // Simple chart representation without external libraries for now
  // In a real implementation, this would use Chart.js or Recharts
  
  const renderSimpleChart = () => {
    if (!data || data.length === 0) {
      return (
        <div className="h-32 flex items-center justify-center text-gray-400">
          No hay datos disponibles
        </div>
      )
    }

    const maxValue = Math.max(...data.map(d => d.value || d.sales || 0))
    
    return (
      <div className="h-32 flex items-end justify-between gap-1">
        {data.map((item, index) => {
          const height = ((item.value || item.sales || 0) / maxValue) * 100
          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div 
                className="w-full bg-gradient-accent rounded-t-sm transition-all duration-500"
                style={{ height: `${height}%` }}
              />
              <span className="text-xs text-gray-300 mt-1 truncate">
                {item.label || item.month}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Card className={className}>
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      {renderSimpleChart()}
    </Card>
  )
}