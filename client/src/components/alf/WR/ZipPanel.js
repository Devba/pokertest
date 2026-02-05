import React, { useState } from 'react'
import PropTypes from 'prop-types'

const ZipPanel = ({ title, children, defaultCollapsed }) => {
  const [collapsed, setCollapsed] = useState(Boolean(defaultCollapsed))
  const toggle = () => setCollapsed((v) => !v)

  return (
    <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'linear-gradient(90deg, rgba(255,255,255,0.02), rgba(0,0,0,0))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ddd', fontWeight: 600 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: collapsed ? '#e74c3c' : '#2ecc71', boxShadow: collapsed ? '0 0 6px rgba(231,76,60,0.3)' : '0 0 8px rgba(46,204,113,0.35)' }} />
          <div>{title}</div>
        </div>
        <button onClick={toggle} style={{ background: 'transparent', border: 'none', color: '#ddd', cursor: 'pointer', fontWeight: 700 }} aria-expanded={!collapsed}>
          {collapsed ? 'Open' : 'Close'}
        </button>
      </div>
      <div style={{
        maxHeight: collapsed ? 0 : 800,
        transition: 'max-height 300ms ease',
        overflow: 'hidden',
        padding: collapsed ? '0 0.75rem' : '0.75rem'
      }}>
        {!collapsed && children}
      </div>
    </div>
  )
}

ZipPanel.propTypes = {
  title: PropTypes.string,
  children: PropTypes.node,
  defaultCollapsed: PropTypes.bool
}

ZipPanel.defaultProps = {
  title: 'Panel',
  defaultCollapsed: false
}

export default React.memo(ZipPanel)
