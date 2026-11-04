export interface PolicySection {
  title: string
  paragraphs: string[]
}

export interface PolicyDocument {
  slug: string
  title: string
  description: string
  sections: PolicySection[]
}

export const policyDocuments: PolicyDocument[] = [
  {
    slug: 'dieu-khoan-thue',
    title: 'Điều khoản thuê thiết bị',
    description:
      'Điều kiện thuê, xác nhận đơn, giá thuê, tiền cọc và trách nhiệm của hai bên trong thời gian thuê.',
    sections: [
      {
        title: '1. Điều kiện thuê',
        paragraphs: [
          'Người thuê cần đủ 18 tuổi và cung cấp giấy tờ tùy thân còn hiệu lực khi nhận máy. Thông tin liên hệ, địa chỉ nhận máy và số điện thoại phải chính xác để A.I.R xác nhận đơn và hỗ trợ khi cần.',
          'Mỗi đơn thuê áp dụng cho một người thuê chính. Người thuê chịu trách nhiệm về thiết bị trong suốt thời gian thuê, kể cả khi để người khác sử dụng.',
        ],
      },
      {
        title: '2. Đặt thuê và xác nhận',
        paragraphs: [
          'Sau khi gửi yêu cầu, hệ thống giữ thiết bị trong 30 phút để A.I.R kiểm tra tồn kho và liên hệ xác nhận. Đơn chỉ có hiệu lực khi trạng thái được cập nhật sang đã xác nhận.',
          'A.I.R có thể từ chối hoặc điều chỉnh đơn nếu thiết bị không còn sẵn sàng, thông tin liên hệ không hợp lệ hoặc có dấu hiệu sử dụng sai mục đích. Khi đó, khoản cọc (nếu đã thu) được hoàn lại.',
        ],
      },
      {
        title: '3. Giá thuê, cọc và phí',
        paragraphs: [
          'Giá thuê được tính theo ngày, bao gồm cả ngày nhận và ngày trả. Các bậc thuê dài ngày, mã giảm giá và phí giao hàng được hiển thị trước khi xác nhận đơn.',
          'Tiền cọc được thu khi nhận máy và hoàn lại sau khi A.I.R kiểm tra tình trạng thiết bị. Cọc có thể bị trừ cho hư hỏng, mất phụ kiện, trả trễ hoặc các khoản phát sinh khác theo biên bản bàn giao.',
        ],
      },
      {
        title: '4. Sử dụng thiết bị',
        paragraphs: [
          'Không cho thuê lại, cầm cố, tháo lắp, sửa chữa hoặc thay đổi cấu hình thiết bị. Không sử dụng thiết bị cho mục đích vi phạm pháp luật hoặc gây nguy hiểm.',
          'Người thuê nên sao lưu dữ liệu và đăng xuất tài khoản cá nhân trước khi trả máy. A.I.R không chịu trách nhiệm với dữ liệu còn lại trên thiết bị sau khi bàn giao.',
        ],
      },
      {
        title: '5. Trả máy và phát sinh',
        paragraphs: [
          'Thiết bị phải được trả đúng thời gian và địa điểm đã xác nhận. Trả trễ có thể phát sinh phí theo giá thuê ngày và ảnh hưởng đến lịch đặt tiếp theo.',
          'Mọi hư hỏng, mất mát hoặc phụ kiện thiếu cần được báo ngay cho A.I.R. Chi phí xử lý được xác định theo mức độ thực tế và biên bản bàn giao, không vượt quá giá trị thiết bị.',
        ],
      },
    ],
  },
  {
    slug: 'huy-don-hoan-coc',
    title: 'Hủy đơn và hoàn tiền',
    description:
      'Thời điểm hủy đơn, mức phí áp dụng, thời hạn hoàn cọc và cách xử lý khi đơn đã giao hoặc đang thuê.',
    sections: [
      {
        title: '1. Hủy trước khi nhận máy',
        paragraphs: [
          'Hủy trước 24 giờ so với giờ nhận máy: miễn phí, hoàn toàn bộ khoản đã thanh toán. Hủy trong vòng 24 giờ: áp dụng phí giữ chỗ 20% giá trị tiền thuê, phần còn lại được hoàn.',
          'Nếu A.I.R không thể giao đúng thiết bị hoặc đơn bị từ chối, người thuê được hoàn toàn bộ khoản đã thanh toán và không chịu phí hủy.',
        ],
      },
      {
        title: '2. Đổi lịch thay vì hủy',
        paragraphs: [
          'Bạn có thể đổi ngày nhận hoặc trả nếu thiết bị còn trống trong lịch mới. Chênh lệch giá được tính lại theo bảng giá tại thời điểm đổi.',
          'Yêu cầu đổi lịch cần được gửi trước giờ nhận ít nhất 12 giờ để A.I.R sắp xếp giao nhận.',
        ],
      },
      {
        title: '3. Đơn đã giao hoặc đang thuê',
        paragraphs: [
          'Đơn đã giao không thể hủy. Trường hợp thiết bị lỗi không do người thuê, A.I.R sẽ đổi máy tương đương hoặc hoàn phần tiền thuê chưa sử dụng.',
          'Thiết bị hư hỏng do sử dụng sai cách, mất phụ kiện hoặc vi phạm điều khoản không thuộc diện hoàn tiền.',
        ],
      },
      {
        title: '4. Thời hạn hoàn tiền',
        paragraphs: [
          'Tiền cọc được hoàn trong 3–5 ngày làm việc sau khi A.I.R kiểm tra xong thiết bị và đối chiếu biên bản bàn giao.',
          'Hoàn tiền thuê (nếu có) được xử lý trong 5–7 ngày làm việc qua phương thức thanh toán ban đầu. Thời gian ghi có thực tế phụ thuộc ngân hàng hoặc ví điện tử.',
        ],
      },
    ],
  },
  {
    slug: 'giao-nhan-kiem-tra',
    title: 'Giao nhận và kiểm tra thiết bị',
    description:
      'Quy trình nhận máy, kiểm tra tình trạng, bảo quản trong thời gian thuê và trả máy đúng quy cách.',
    sections: [
      {
        title: '1. Hình thức nhận máy',
        paragraphs: [
          'Bạn có thể nhận tại cửa hàng hoặc chọn giao hàng nội thành. Phí giao được tính theo khu vực và miễn phí khi giá trị thuê đạt ngưỡng của khu vực đó.',
          'Thời gian giao dự kiến được thông báo khi xác nhận đơn. Vui lòng có mặt đúng hẹn và chuẩn bị giấy tờ tùy thân để hoàn tất bàn giao.',
        ],
      },
      {
        title: '2. Kiểm tra khi nhận',
        paragraphs: [
          'Cùng nhân viên kiểm tra ngoại hình, màn hình, bàn phím, camera, pin, cổng kết nối và phụ kiện đi kèm. Chụp ảnh hoặc quay video tình trạng máy ngay khi nhận để làm căn cứ.',
          'Nếu phát hiện lỗi không được ghi trong biên bản, báo ngay cho A.I.R trước khi sử dụng. Không tự sửa chữa hoặc mang máy đến nơi khác.',
        ],
      },
      {
        title: '3. Bảo quản trong thời gian thuê',
        paragraphs: [
          'Giữ thiết bị khô ráo, tránh va đập, nhiệt độ cao và nguồn nước. Sử dụng đúng bộ sạc và phụ kiện đi kèm.',
          'Không cài đặt phần mềm không rõ nguồn gốc, không thay đổi mật khẩu quản trị và không tháo ốp lưng hoặc tem niêm phong (nếu có).',
        ],
      },
      {
        title: '4. Trả máy',
        paragraphs: [
          'Vệ sinh cơ bản, sao lưu và đăng xuất tài khoản cá nhân trước khi trả. Đối chiếu đủ phụ kiện, hộp và giấy tờ đi kèm.',
          'A.I.R kiểm tra tình trạng máy trước mặt bạn. Biên bản trả máy là căn cứ để hoàn cọc và xử lý các khoản phát sinh.',
        ],
      },
    ],
  },
  {
    slug: 'bao-mat-du-lieu',
    title: 'Quyền riêng tư và trợ lý AI',
    description:
      'Dữ liệu A.I.R thu thập, cách lưu trữ, phạm vi sử dụng trợ lý AI và quyền kiểm soát thông tin của bạn.',
    sections: [
      {
        title: '1. Dữ liệu chúng tôi thu thập',
        paragraphs: [
          'Thông tin tài khoản và liên hệ: họ tên, email, số điện thoại, địa chỉ giao nhận. Thông tin đơn thuê: thiết bị, lịch thuê, trạng thái đơn và lịch sử thanh toán.',
          'Dữ liệu kỹ thuật tối thiểu phục vụ vận hành và bảo mật, chẳng hạn nhật ký lỗi và thời điểm truy cập. A.I.R không bán dữ liệu cá nhân cho bên thứ ba.',
        ],
      },
      {
        title: '2. Lưu trữ và chia sẻ',
        paragraphs: [
          'Dữ liệu được lưu trên hạ tầng Supabase và chỉ chia sẻ với nhà cung cấp cần thiết để vận hành dịch vụ (lưu trữ, email giao dịch, thanh toán).',
          'Giỏ thuê trên trình duyệt được lưu cục bộ để giữ lựa chọn của bạn giữa các lần truy cập. Bạn có thể xóa bằng cách xóa dữ liệu trang trong trình duyệt.',
        ],
      },
      {
        title: '3. Trợ lý AI',
        paragraphs: [
          'Trợ lý trả lời câu hỏi thường gặp và gợi ý thiết bị. Khi tính năng AI được bật, nội dung tin nhắn có thể được gửi tới nhà cung cấp mô hình để tạo câu trả lời.',
          'Không nhập số thẻ, mật khẩu, giấy tờ tùy thân hoặc thông tin sức khỏe vào chat. Nếu không muốn nội dung được xử lý bởi AI, hãy dùng các trang hướng dẫn và chính sách.',
        ],
      },
      {
        title: '4. Quyền của bạn',
        paragraphs: [
          'Bạn có thể xem và cập nhật thông tin tài khoản, địa chỉ giao nhận trong mục Tài khoản. Yêu cầu xóa tài khoản hoặc dữ liệu liên quan được tiếp nhận qua kênh hỗ trợ.',
          'Dữ liệu giao dịch có thể được lưu thêm theo yêu cầu kế toán và giải quyết tranh chấp, sau đó được xóa hoặc ẩn danh khi không còn cần thiết.',
        ],
      },
    ],
  },
  {
    slug: 'phan-anh',
    title: 'Phản ánh và hỗ trợ',
    description:
      'Cách liên hệ khi cần hỗ trợ, thời gian phản hồi và quy trình xử lý sự cố thiết bị hoặc đơn thuê.',
    sections: [
      {
        title: '1. Kênh liên hệ',
        paragraphs: [
          'Bạn có thể mở trợ lý trực tuyến trên website, gửi email tới bộ phận hỗ trợ hoặc phản ánh trực tiếp trong trang đơn thuê. Vui lòng kèm mã đơn để được tra cứu nhanh.',
          'Với sự cố thiết bị trong thời gian thuê, hãy liên hệ ngay trước khi tự xử lý để tránh phát sinh trách nhiệm.',
        ],
      },
      {
        title: '2. Thời gian phản hồi',
        paragraphs: [
          'Yêu cầu thông thường được phản hồi trong 24 giờ làm việc. Sự cố ảnh hưởng đến việc sử dụng thiết bị được ưu tiên xử lý trong ngày.',
          'Thời gian xử lý thực tế có thể thay đổi vào cuối tuần, ngày lễ hoặc khi cần phối hợp với đơn vị giao nhận.',
        ],
      },
      {
        title: '3. Quy trình xử lý',
        paragraphs: [
          'A.I.R tiếp nhận thông tin, xác minh mã đơn và tình trạng thực tế, sau đó đề xuất phương án: đổi máy, điều chỉnh lịch, hoàn tiền hoặc hướng dẫn khắc phục.',
          'Các vấn đề liên quan đến tiền cọc hoặc hoàn tiền cần kèm biên nhận và thông tin thanh toán. Kết quả xử lý được thông báo qua email hoặc số điện thoại đã đăng ký.',
        ],
      },
    ],
  },
]
