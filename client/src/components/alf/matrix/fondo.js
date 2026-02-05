
import React, { useRef, useEffect } from 'react'

// Matrix-style animated background using two layered canvases
const FondoMatrix = ({ style, className }) => {
  const canvasRef = useRef(null)
  const canvasTopRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const canvasTop = canvasTopRef.current
    if (!canvas || !canvasTop) return

    const ctx = canvas.getContext('2d')
    const ctxTop = canvasTop.getContext('2d')

    let cw = window.innerWidth
    let ch = window.innerHeight
    const dpr = Math.max(1, window.devicePixelRatio || 1)

    const charArr = 'abcdefghijklmnopqrstuvwxyz'.split('')
    const fontSize = 12
    let maxColumns = Math.floor(cw / fontSize)
    let falling = []

    function resize() {
      cw = window.innerWidth
      ch = window.innerHeight
      maxColumns = Math.floor(cw / fontSize)

      canvas.style.width = cw + 'px'
      canvas.style.height = ch + 'px'
      canvas.width = Math.floor(cw * dpr)
      canvas.height = Math.floor(ch * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      canvasTop.style.width = cw + 'px'
      canvasTop.style.height = ch + 'px'
      canvasTop.width = Math.floor(cw * dpr)
      canvasTop.height = Math.floor(ch * dpr)
      ctxTop.setTransform(dpr, 0, 0, dpr, 0, 0)

      // reinit columns
      falling = []
      for (let i = 0; i < maxColumns; i++) {
        falling.push({ x: i * fontSize, y: Math.random() * -500, speed: Math.random() * 3 + 2 })
      }
    }

    function randChar() {
      return charArr[Math.floor(Math.random() * charArr.length)].toUpperCase()
    }

    function update() {
      // fade background slightly
      ctx.fillStyle = 'rgba(0,0,0,0.05)'
      ctx.fillRect(0, 0, cw, ch)

      ctxTop.clearRect(0, 0, cw, ch)

      ctx.fillStyle = '#0F0'
      ctx.font = `${fontSize}px sans-serif`
      ctxTop.fillStyle = 'rgba(255,255,255,0.85)'
      ctxTop.font = `${fontSize}px sans-serif`

      for (let i = 0; i < falling.length; i++) {
        const p = falling[i]
        const chv = randChar()
        ctxTop.fillText(chv, p.x, p.y)
        ctx.fillText(chv, p.x, p.y)

        p.y += p.speed
        if (p.y > ch) {
          p.y = Math.random() * -100
          p.speed = Math.random() * 3 + 2
        }
      }

      rafRef.current = requestAnimationFrame(update)
    }

    resize()
    window.addEventListener('resize', resize)
    rafRef.current = requestAnimationFrame(update)

    return () => {
      window.removeEventListener('resize', resize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', ...style }} className={className}>
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />
      <canvas ref={canvasTopRef} style={{ position: 'absolute', top: 0, left: 0 }} />
    </div>
  )
}

export default FondoMatrix