// Mã đơn dạng AIR-XXXXXX (bỏ các ký tự dễ nhầm: I, O, 0, 1).

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export const generateOrderCode = () => {
  let code = ''
  for (let i = 0; i < 6; i += 1) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return `AIR-${code}`
}
