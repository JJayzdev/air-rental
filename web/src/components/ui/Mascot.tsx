interface MascotProps {
  small?: boolean
  className?: string
}

export default function Mascot({ small = false, className = '' }: MascotProps) {
  return (
    <span className={`mascot ${small ? 'mascot-small' : ''} ${className}`.trim()}>
      {/* Ảnh tĩnh trong /public — dùng <img> để giữ nguyên CSS gốc */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt="Robot chim A.I.R" src="/air-robot-mascot.webp" />
    </span>
  )
}
