import Mascot from '../ui/Mascot'

interface ChatLauncherProps {
  onOpen: () => void
}

/** Nút mascot nổi ở góc phải màn hình — mở trợ lý A.I.R. */
export default function ChatLauncher({ onOpen }: ChatLauncherProps) {
  return (
    <button className="assistant-fab" aria-label="Mở trợ lý A.I.R" onClick={onOpen}>
      <Mascot small />
      <span className="notification" />
      <span className="tooltip">Trợ lý A.I.R</span>
    </button>
  )
}
