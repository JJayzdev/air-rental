import Link from 'next/link'

export interface Guide {
  slug: string
  title: string
  description: string
  updated: string
  category: string
  body: React.ReactNode
}

export const guides: Guide[] = [
  {
    slug: 'chon-laptop-de-thue-theo-cong-viec',
    title: 'Cách chọn laptop thuê theo công việc',
    description:
      'Xác định cấu hình laptop cần thuê từ ứng dụng, khối lượng công việc và thời gian sử dụng.',
    updated: '2026-11-02',
    category: 'Chọn thiết bị',
    body: (
      <>
        <p>
          Chọn laptop theo việc bạn cần hoàn thành sẽ dễ hơn chọn theo tên dòng máy. Hãy ghi lại ứng
          dụng cần dùng, nơi làm việc và thời gian dự kiến trước khi so sánh cấu hình.
        </p>
        <h2>1. Liệt kê ứng dụng và tệp bạn sẽ làm việc</h2>
        <p>
          Văn bản, bảng tính và họp trực tuyến thường không đòi hỏi cấu hình giống dựng video, thiết
          kế 3D hay xử lý bộ dữ liệu lớn. Kiểm tra yêu cầu hệ thống của phần mềm và dung lượng tệp
          thực tế; nếu có dự án mẫu, thử mở dự án đó trên máy trước khi bắt đầu công việc quan
          trọng. Với Windows, có thể đối chiếu thêm{' '}
          <a
            href="https://learn.microsoft.com/windows/whats-new/windows-11-requirements"
            target="_blank"
            rel="noreferrer"
          >
            yêu cầu hệ thống Windows 11 của Microsoft
          </a>
          ; yêu cầu của từng ứng dụng có thể cao hơn.
        </p>
        <h2>2. Chọn theo mức tải, không theo một thông số riêng</h2>
        <p>
          RAM ảnh hưởng đến khả năng chạy nhiều ứng dụng cùng lúc; bộ xử lý và đồ họa tác động tới
          các tác vụ tính toán, dựng hình. Dung lượng SSD quyết định không gian lưu dự án; hiệu năng
          đọc/ghi còn phụ thuộc mẫu ổ và cấu hình máy. Hãy đối chiếu cả ba với yêu cầu phần mềm thay
          vì chỉ nhìn tên chip.
        </p>
        <h2>3. Tính đến cách bạn mang và dùng máy</h2>
        <p>
          Nếu thường xuyên di chuyển, cân nhắc kích thước màn hình, trọng lượng và thời lượng pin
          công bố. Nếu làm việc tại bàn, màn hình lớn hơn hoặc cổng kết nối phù hợp có thể hữu ích.
          Thông số pin thực tế còn phụ thuộc tác vụ, độ sáng và tình trạng máy.
        </p>
        <h2>4. Xác nhận cấu hình và tình trạng trước khi nhận</h2>
        <p>
          Đối chiếu đúng model, RAM, lưu trữ, bộ sạc và các cổng cần dùng. Kiểm tra bàn phím, màn
          hình, webcam, Wi-Fi và pin; lưu lại tình trạng máy khi nhận để hai bên cùng có căn cứ.
        </p>
        <p>
          <Link href="/san-pham?danh-muc=laptop">Tham khảo danh mục laptop</Link>. Catalog hiện có
          thể chứa dữ liệu mẫu; hãy kiểm tra thông tin và khả năng cung cấp trên từng thiết bị.
        </p>
      </>
    ),
  },
  {
    slug: 'chon-may-anh-cho-chuyen-di-va-su-kien',
    title: 'Chọn máy ảnh thuê cho chuyến đi hoặc sự kiện',
    description:
      'So sánh máy ảnh theo mục đích chụp, ống kính, khả năng lấy nét và phụ kiện cần chuẩn bị.',
    updated: '2026-11-02',
    category: 'So sánh thiết bị',
    body: (
      <>
        <p>
          Máy ảnh phù hợp phụ thuộc nhiều vào cảnh cần chụp và người sử dụng hơn là một con số
          megapixel. Trước khi thuê, hãy xác định bạn chụp ảnh tĩnh, quay video hay cần cả hai.
        </p>
        <h2>Chọn loại máy theo tình huống</h2>
        <p>
          Máy ảnh mirrorless thường gọn hơn các bộ máy DSLR tương đương và có thể thay ống kính.
          DSLR có kính ngắm quang học và hệ phụ kiện phong phú ở một số dòng. Máy compact gọn, ít
          phải chọn ống kính riêng nhưng giới hạn khả năng thay đổi tiêu cự và nâng cấp. Tính năng
          cụ thể khác nhau theo từng model.
        </p>
        <h2>Ống kính quan trọng không kém thân máy</h2>
        <p>
          Tiêu cự ảnh hưởng đến góc nhìn: tiêu cự ngắn thường cho góc nhìn rộng hơn, còn tiêu cự dài
          cho góc nhìn hẹp hơn. Hãy chọn theo khoảng cách đến chủ thể và không gian chụp, đồng thời
          kiểm tra ống kính có tương thích với ngàm máy hay không. Có thể xem phần{' '}
          <a
            href="https://files.canon-europe.com/files/webcontent/rf-lens-world/knowledge/focus/index.html"
            target="_blank"
            rel="noreferrer"
          >
            giải thích tiêu cự của Canon
          </a>{' '}
          để làm quen với khái niệm.
        </p>
        <h2>Nếu quay video, kiểm tra thêm</h2>
        <p>
          Đối chiếu độ phân giải và tốc độ khung hình bạn cần, thời lượng quay liên tục, cổng micro
          và khả năng chống rung. Thẻ nhớ, pin dự phòng, chân máy và micro ngoài có thể cần thiết;
          xác nhận rõ phụ kiện nào đi cùng bộ máy.
        </p>
        <h2>Thử trước khi rời điểm nhận</h2>
        <p>
          Chụp thử, xem lại ảnh, kiểm tra lấy nét, màn hình, nút bấm, pin và thẻ nhớ. Thống nhất
          cách xử lý tệp ảnh sau chuyến đi và không lưu tài khoản cá nhân trên thiết bị nếu không
          cần thiết.
        </p>
        <p>
          <Link href="/san-pham?danh-muc=camera">Xem danh mục máy ảnh</Link>. Thông tin model, phụ
          kiện và tình trạng sẵn có cần được xác nhận riêng cho thiết bị cụ thể.
        </p>
      </>
    ),
  },
  {
    slug: 'thue-hay-mua-thiet-bi-cong-nghe',
    title: 'Thuê hay mua thiết bị công nghệ: cách tự so sánh',
    description:
      'Khung tính đơn giản để cân nhắc thời gian sử dụng, chi phí sở hữu và sự linh hoạt khi cần thiết bị.',
    updated: '2026-11-02',
    category: 'Kinh nghiệm thuê',
    body: (
      <>
        <p>
          Thuê và mua phục vụ những nhu cầu khác nhau. Bạn có thể so sánh bằng tổng chi phí dự kiến
          trong khoảng thời gian mình thực sự cần thiết bị, thay vì chỉ nhìn giá mua ban đầu hoặc
          giá thuê mỗi ngày.
        </p>
        <h2>Ước tính tổng chi phí sở hữu</h2>
        <p>
          Khi mua, cộng giá mua với phụ kiện, bảo dưỡng và chi phí vốn nếu có; trừ giá trị bán lại
          ước tính khi không còn dùng. Giá trị bán lại khó dự đoán và phụ thuộc tình trạng, tuổi máy
          cùng nhu cầu thị trường, nên hãy dùng một khoảng ước tính thận trọng.
        </p>
        <h2>Ước tính tổng chi phí thuê</h2>
        <p>
          Cộng tiền thuê cho toàn bộ ngày cần dùng và các chi phí được nêu trong báo giá, chẳng hạn
          giao nhận nếu áp dụng. Ghi riêng khoản cọc/bảo đảm: khoản được hoàn đủ không tự động là
          chi phí thuê, nhưng vẫn là số tiền cần chuẩn bị; chỉ tính là chi phí phần bị khấu trừ theo
          điều kiện đã thỏa thuận. Xác nhận cách tính ngày thuê, điều kiện gia hạn, trách nhiệm khi
          hư hỏng và thời điểm hoàn khoản này với nhà cung cấp.
        </p>
        <p>
          Trong luồng đặt thuê hiện tại của A.I.R, ngày bắt đầu và ngày kết thúc được tính vào số
          ngày thuê; hệ thống giữ thêm một ngày đệm giữa các lượt thuê. Bước thanh toán có thể áp
          dụng bậc giá theo thời lượng, mã giảm giá và phí giao theo khu vực; tiền cọc được gắn với
          từng sản phẩm. Hãy xem tổng tiền và thông tin từng thiết bị ở bước đặt thuê trước khi gửi
          yêu cầu. Dữ liệu catalog hiện có thể là dữ liệu mẫu, nên các con số trong giao diện chưa
          phải báo giá hay xác nhận tồn kho.
        </p>
        <h2>Đưa nhu cầu sử dụng vào quyết định</h2>
        <p>
          Thuê có thể hợp lý khi nhu cầu ngắn hạn, theo dự án hoặc bạn cần thử thiết bị trước khi
          quyết định. Mua có thể thuận tiện nếu dùng thường xuyên, lâu dài và muốn luôn chủ động có
          máy. Cũng cân nhắc thời gian tìm, nhận và trả thiết bị cùng việc chuyển dữ liệu cá nhân.
        </p>
        <h2>Dùng một phép so sánh nhất quán</h2>
        <p>
          So sánh cùng cấu hình và cùng khoảng thời gian. Ghi rõ các giả định về số ngày dùng, phụ
          kiện, bảo trì, giá bán lại và điều kiện thuê; thay đổi từng giả định để xem kết luận có
          còn phù hợp không.
        </p>
        <p>
          <Link href="/san-pham">Tham khảo catalog thiết bị</Link>. Giá và khả năng cung cấp hiển
          thị trong môi trường này có thể là dữ liệu mẫu, không phải báo giá xác nhận.
        </p>
      </>
    ),
  },
]
