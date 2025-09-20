import React from 'react'
import Card from './Card'

export default function Table({ title, columns, data, className = '' }) {
  return (
    <Card className={className} hover={false}>
      {title && <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>}
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/20">
              {columns.map((column, index) => (
                <th 
                  key={index}
                  className="text-left py-3 px-4 font-medium text-gray-300 first:pl-0 last:pr-0"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr 
                key={rowIndex}
                className="border-b border-white/10 hover:bg-white/5 transition-colors"
              >
                {columns.map((column, colIndex) => (
                  <td 
                    key={colIndex}
                    className="py-3 px-4 text-white first:pl-0 last:pr-0"
                  >
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {data.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          No hay datos disponibles
        </div>
      )}
    </Card>
  )
}