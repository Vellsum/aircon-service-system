import './PortalWelcomeBanner.css'

function PortalWelcomeBanner({
  as: Element = 'section',
  className = '',
  eyebrow,
  title,
  subtitle,
  rightContent,
  decoration,
  children,
}) {
  return (
    <Element className={`portal-welcome-banner ${className}`.trim()}>
      {decoration}
      <div className="portal-welcome-copy">
        {eyebrow && <div className="portal-welcome-eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p className="portal-welcome-subtitle">{subtitle}</p>
        {children}
      </div>
      {rightContent && <div className="portal-welcome-right">{rightContent}</div>}
    </Element>
  )
}

export default PortalWelcomeBanner
