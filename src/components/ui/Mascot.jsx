export default function Mascot({ small = false, className = '' }) {
  return (
    <span className={`mascot ${small ? 'mascot-small' : ''} ${className}`.trim()}>
      <img alt="Robot chim A.I.R" src="/air-robot-mascot.png" />
    </span>
  )
}
