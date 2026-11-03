export interface PolicySection {
  title: string
  paragraphs: string[]
}

export interface PolicyDraft {
  slug: string
  title: string
  description: string
  sections: PolicySection[]
}

/** UI summaries are kept aligned with the five academic scenarios in docs/launch/policies/. */
export const policyDrafts: PolicyDraft[] = [
  {
    slug: 'dieu-khoan-thue',
    title: 'Điều khoản thuê thiết bị — kịch bản mô phỏng',
    description: 'Mô hình dữ liệu mẫu, giỏ thuê, đơn test và các giới hạn của đồ án.',
    sections: [
      {
        title: 'Phạm vi học tập',
        paragraphs: [
          'A.I.R là đồ án giao diện và luồng thuê giả lập, không phải dịch vụ cho thuê. Tên thiết bị, giá, khách hàng, lịch, đơn và khoản thanh toán trong bài là dữ liệu thử. Sản phẩm có nhãn MẪU chỉ để minh họa và không thể đặt thuê.',
          'Không nhập dữ liệu cá nhân thật. Email magic link trên Supabase local chỉ đăng nhập vào môi trường thử. Tài liệu hoặc thao tác trong bài không tạo hợp đồng, giao dịch hay cam kết ngoài đời.',
        ],
      },
      {
        title: 'Luồng đặt giả lập',
        paragraphs: [
          'Catalog sample mặc định chỉ phục vụ xem. Muốn chạy checkout cần Supabase local, tài khoản test, sản phẩm active không phải sample, unit khả dụng và dữ liệu vùng giao hàng của fixture. Checkout tính số liệu ở server/database; giá và đơn vẫn là dữ liệu thử.',
          'Logic bài tập tính cả ngày bắt đầu và ngày kết thúc, có ngày đệm cho lịch. Các bậc giá, mã giảm, phí giao và tiền cọc đến từ seed hoặc fixture; không phải bảng giá thật.',
        ],
      },
      {
        title: 'Trạng thái và thanh toán',
        paragraphs: [
          'Các trạng thái chờ, xác nhận, giao, đang thuê, trả, hoàn tất hoặc hủy chỉ mô tả vòng đời phần mềm. Thanh toán mock, nếu được chạy, dùng webhook local; không có ngân hàng hoặc SePay thật, không chuyển khoản và không tải chứng từ thật.',
          'Không tạo phí hư hỏng, giao nhận hoặc bồi thường. Nếu code không cho thực hiện thao tác trong trạng thái hiện tại, ghi lại sai khác và không sửa trực tiếp database.',
        ],
      },
    ],
  },
  {
    slug: 'huy-don-hoan-coc',
    title: 'Hủy đơn và hoàn tiền — kịch bản mô phỏng',
    description: 'Bài tập trạng thái hủy, ledger mock và đối soát bằng dữ liệu tổng hợp.',
    sections: [
      {
        title: 'Hủy đơn test',
        paragraphs: [
          'Trong tình huống đồ án, dừng một yêu cầu giả lập không phát sinh phí. Chỉ dùng nút hủy khi ứng dụng hiển thị và code hỗ trợ trạng thái đó. Nếu thao tác không khả dụng, ghi nhận sai khác và dừng diễn tập; không ép chuyển trạng thái trong database.',
          'Hủy một order local giải phóng giữ chỗ theo logic phần mềm nhưng không hủy giao dịch thật hay gửi thông báo tới nhà cung cấp.',
        ],
      },
      {
        title: 'Số tiền và cọc giả lập',
        paragraphs: [
          'Tiền thuê, mã giảm, phí giao, cọc và số đã thu là số liệu fixture. Một trạng thái mock-paid không phải chứng từ ngân hàng và không tạo nghĩa vụ thanh toán.',
          'Kịch bản lớp học giả định hoàn toàn bộ tiền cọc mock sau khi checklist trả máy được đối chiếu. Ledger có thể ghi nhận refund pending/refunded, nhưng không có lệnh chuyển tiền. Không dùng các con số trong UI làm giá hoặc chính sách.',
        ],
      },
      {
        title: 'Đối soát và giới hạn',
        paragraphs: [
          'Có thể dùng fixture để thảo luận chuyển thiếu/thừa, replay hoặc đơn hết hạn. Mục tiêu là kiểm tra tính nhất quán và idempotency của phần mềm. Không tạo giao dịch thật, gọi ngân hàng, hoặc chỉnh ledger thủ công để ép kết quả.',
          'Kịch bản không đặt phí hủy, phí hoàn hoặc thời hạn tiền về vì không có giao dịch ngoài đời. Người học có thể dừng bài tập mà không mất tiền hay ảnh hưởng quyền học tập.',
        ],
      },
    ],
  },
  {
    slug: 'giao-nhan-kiem-tra',
    title: 'Giao nhận và kiểm tra — kịch bản mô phỏng',
    description: 'Tabletop checklist cho giao, nhận trả, phụ kiện và sự cố thiết bị giả lập.',
    sections: [
      {
        title: 'Phạm vi',
        paragraphs: [
          'A.I.R không giao nhận thiết bị vật lý trong đồ án. Mọi model, asset tag, lịch nhận/trả và ghi chú hư hỏng đều là fixture. Nếu lớp dùng thiết bị của nhóm hoặc trường, việc mượn chịu quy định riêng của chủ thiết bị, không thuộc kịch bản này.',
          'Chỉ dùng mã `DEMO-*`; không nhập serial thật, dữ liệu liên hệ, chữ ký hoặc giấy tờ định danh.',
        ],
      },
      {
        title: 'Diễn tập bàn giao và nhận trả',
        paragraphs: [
          'Người học đối chiếu mã asset giả lập, phụ kiện, tình trạng trước/sau và bất thường. Ghi rõ đâu là dữ kiện quan sát trong fixture và đâu là giả định. Mã ảnh hoặc bằng chứng phải là hư cấu hoặc được phép dùng trong lớp.',
          'Trước khi trả, kịch bản có thể nhắc sao lưu và đăng xuất tài khoản cá nhân nhưng không yêu cầu thực hiện trên thiết bị thật. Không reset, xóa hay thay đổi thiết bị thật trong bài demo.',
        ],
      },
      {
        title: 'Lịch và sai khác',
        paragraphs: [
          'Luồng local tính ngày bắt đầu/kết thúc và ngày đệm để minh họa lịch. Trạng thái đơn không đặt lịch vận chuyển hay giữ máy vật lý. Không tạo phí hư hỏng, trả trễ hoặc bồi thường.',
          'Nếu checklist khác trạng thái fixture, ghi lại bước tái hiện và mã test. Không tự quy trách nhiệm cho người học hoặc cập nhật trạng thái trực tiếp trong database.',
        ],
      },
    ],
  },
  {
    slug: 'bao-mat-du-lieu',
    title: 'Quyền riêng tư và AI — kịch bản mô phỏng',
    description: 'Mô tả localStorage, tài khoản local, log và các giới hạn của chat tùy chọn.',
    sections: [
      {
        title: 'Dữ liệu trong prototype và ứng dụng',
        paragraphs: [
          'Bản prototype ở `/demo` lưu giỏ, đơn và hồ sơ giả lập trong localStorage; dữ liệu còn lại sau khi đóng tab cho tới khi xóa site data. Giỏ Next.js lưu riêng. Không nhập tên, số điện thoại, địa chỉ hay tài khoản thật.',
          'Bài backend dùng Supabase local và Mailpit với fixture tổng hợp. Không tải thông tin cá nhân hoặc giấy tờ lên; tài liệu này không xác nhận cấu hình của một dịch vụ public.',
        ],
      },
      {
        title: 'Chat, tích hợp và quyền truy cập',
        paragraphs: [
          'Khi không có quota backend được cấu hình, chat FAQ chạy local và không gọi API. Với backend, quota cần `CHAT_RATE_LIMIT_SECRET` và service role RPC. LLM OpenAI là tùy chọn, mặc định tắt; nếu bật ngoài local, nội dung prompt rời máy và chỉ được thử với dữ liệu giả.',
          'Giấy tờ định danh tắt mặc định. Không gửi OTP, giấy tờ hoặc thông tin tài chính vào chat. RLS được kiểm thử trên local không chứng minh project hosted được cấu hình tương tự.',
        ],
      },
      {
        title: 'Lưu trữ và xóa dữ liệu bài tập',
        paragraphs: [
          'Site data xóa các bản ghi prototype trong trình duyệt nhưng không xóa database fixture. Database, log và archive local có thể còn dữ liệu test sau khi dừng ứng dụng; chỉ dọn theo marker của fixture, không dùng reset diện rộng cho database dùng chung.',
          'Kịch bản không xác lập retention của khách hàng thật. Lưu báo cáo, ảnh và fixture theo quy định học phần; không commit secrets hoặc thông tin riêng của người học.',
        ],
      },
    ],
  },
  {
    slug: 'phan-anh',
    title: 'Phản ánh lỗi — kịch bản mô phỏng',
    description:
      'Cách ghi issue và diễn tập phản hồi cho lỗi trong đồ án, không phải kênh hỗ trợ khách hàng.',
    sections: [
      {
        title: 'Phạm vi phản ánh',
        paragraphs: [
          'Người học có thể ghi nhận lỗi giao diện, catalog sample, trạng thái fixture, tính toán thử, phân quyền hoặc nội dung tài liệu. Đây là phản ánh về đồ án, không phải khiếu nại hợp đồng thuê. A.I.R không có trung tâm hỗ trợ khách hàng thật.',
          'Dùng kênh trao đổi/nộp bài của lớp. Ghi bước tái hiện, môi trường và kết quả mong đợi/thực tế; chỉ đính kèm ảnh đã loại bỏ dữ liệu riêng tư.',
        ],
      },
      {
        title: 'Quy trình nhóm đồ án',
        paragraphs: [
          'Ghi issue, phân loại theo UI/dữ liệu/luồng/quyền, tái hiện bằng fixture tổng hợp local, ghi kết quả và đóng theo quy trình học phần. Không có SLA hay thời hạn phản hồi được cam kết trong kịch bản.',
          'Nếu vô tình nhập dữ liệu thật, không sao chép thêm vào issue. Xóa site data của prototype khi phù hợp và báo qua kênh lớp để người phụ trách xác định có fixture local cần dọn hay không.',
        ],
      },
      {
        title: 'Giả lập thanh toán và quyền riêng tư',
        paragraphs: [
          'Các trạng thái paid/refunded chỉ là fixture. Không chuyển khoản, liên hệ ngân hàng hoặc yêu cầu hoàn tiền thật. Không gửi yêu cầu riêng tư qua chat demo.',
          'Issue không phải kênh xử lý tranh chấp thương mại; bài học không đặt khoản phải trả hay hình phạt tài chính. Đánh giá học tập theo đề cương của môn.',
        ],
      },
    ],
  },
]
