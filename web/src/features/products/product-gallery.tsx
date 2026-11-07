'use client'

import Image from 'next/image'
import { useState } from 'react'

/**
 * Ảnh trang chi tiết. Admin và đối tác lưu được tới 8 ảnh nhưng trang trước đây chỉ hiện ảnh
 * đầu; khi có nhiều ảnh, hiện dải ảnh nhỏ ở đáy để chuyển ảnh chính.
 */
export function ProductGallery({
  images,
  alt,
  isSample,
}: {
  images: string[]
  alt: string
  isSample: boolean
}) {
  const [index, setIndex] = useState(0)
  const current = images[index] ?? images[0]
  return (
    <div className="catalog-detail-image">
      <Image src={current} alt={alt} fill priority sizes="(max-width: 760px) 100vw, 55vw" />
      {isSample && <span className="catalog-sample-badge">Ảnh tham khảo</span>}
      {images.length > 1 && (
        <div className="catalog-gallery-thumbs" role="group" aria-label="Chọn ảnh sản phẩm">
          {images.map((image, imageIndex) => (
            <button
              key={`${image}-${imageIndex}`}
              type="button"
              className="catalog-gallery-thumb"
              aria-label={`Xem ảnh ${imageIndex + 1} trên ${images.length}`}
              aria-pressed={imageIndex === index}
              onClick={() => setIndex(imageIndex)}
            >
              <Image src={image} alt="" fill sizes="56px" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
