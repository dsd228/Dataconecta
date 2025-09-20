import React from 'react'

export default function Card({ children, className = '', hover = true }) {
  return (
    <div className={`glass-card p-6 ${hover ? 'hover:scale-105' : ''} transition-transform duration-300 ${className}`}>
      {children}
    </div>
  )
}