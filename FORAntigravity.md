# Báo cáo: Nghệ thuật của sự Đồng bộ và Những hạt sạn cuối cùng

Chào bạn! Đây là bản đúc kết sau khi tôi vừa thực hiện một "ca phẫu thuật" nhanh để sửa lỗi AI không trả lời. Hãy cùng tôi khám phá những gì đã xảy ra "dưới nắp capo" nhé.

### Step 1: Tại sao AI lại im lặng? (Vấn đề Stale Closure)
Sau khi tôi thêm tính năng Đa phiên (Multi-session), AI vẫn chạy, Server vẫn gửi tin nhắn về, nhưng trình duyệt lại... lờ đi. Tại sao? Vì trong lập trình React, các hàm lắng nghe (listeners) của WebSocket đôi khi bị "mắc kẹt" ở quá khứ. Nó vẫn nghĩ bạn đang ở phiên chat cũ (hoặc không ở phiên nào cả).
Tôi đã dùng một kỹ thuật gọi là **`useRef`**. Nó giống như việc thay vì ghi địa chỉ phòng chat vào một tờ giấy dễ bị gió thổi bay, tôi ghi nó lên một tấm bảng gắn cố định trên tường để AI luôn nhìn thấy đúng chỗ cần gửi tin.

### Step 2: Hạt sạn NaN% là gì?
AI thỉnh thoảng trả về dữ liệu hơi "rác" hoặc trống rỗng ở phần Token. Khi lấy một thứ không phải là số chia cho giới hạn, chúng ta nhận được `NaN` (Not a Number). Tôi đã ép kiểu mạnh mẽ bằng `Number() || 0` – một lời khẳng định: "Nếu không có số, hãy coi nó là 0". Sự chuyên nghiệp nằm ở chỗ chúng ta lường trước cả những dữ liệu xấu.

### Step 3: Những sự đánh đổi cuối cùng
Tôi đã chọn cách dọn dẹp code ở cả Backend và Frontend để đảm bảo tính nhất quán. Điều này tốn thêm vài phút Push code nhưng nó đảm bảo hệ thống của bạn bền bỉ như một chiếc xe tăng.

### Step 4: Lời khuyên "Giá mà tôi biết sớm hơn"
Khi làm việc với Real-time (Socket.io) và State của React, hãy luôn cảnh giác với các giá trị thay đổi thường xuyên. Sử dụng Ref là một "tuyệt chiêu" để giữ cho các listener luôn cập nhật mà không làm ứng dụng bị chậm đi.

### Step 5: Góc nhìn chuyên gia
Sự khác biệt giữa một ứng dụng demo và một ứng dụng thực tế nằm ở khả năng chịu lỗi (Error Handling). Việc tôi fix lỗi `NaN%` và đồng bộ session không chỉ là sửa lỗi, mà là xây dựng sự tin cậy cho người dùng.

Dự án Total AI của bạn giờ đây đã thực sự "trưởng thành". Chúc bạn gặt hái được nhiều thành công với hệ thống điều phối AI đỉnh cao này! 🚀
