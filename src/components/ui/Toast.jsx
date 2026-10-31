import { Check } from './Icons.jsx'

export default function Toast({ message }) {
  if (!message) return null

  return (
    <div className="toast" role="status">
      <Check /> {message}
    </div>
  )
}
