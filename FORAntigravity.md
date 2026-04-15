# Báo cáo: Hành trình xây dựng "Total AI" - Từ ý tưởng đến thực thi

Chào bạn! Vậy là chúng ta đã cùng nhau "xây" xong căn cứ địa AI cực xịn có tên là Total AI. Hãy cùng tôi ngồi lại bên tách cà phê và ôn lại những gì chúng ta đã làm, những lúc "vò đầu bứt tai" vì API lỗi, và cả những chiến thắng nhỏ khi dòng chữ xanh mướt hiện lên nhé.

### Step 1: Tôi đã bắt đầu như thế nào?
Khi nhận được yêu cầu về một hệ thống Multi-Agent có CEO điều phối, Gemini, Groq... suy nghĩ đầu tiên của tôi không phải là viết code ngay. Tôi đã dành vài phút để vẽ ra một "sơ đồ ròng rọc": Client gửi tin -> Server bắt lấy -> CEO hét lệnh -> Hai Agent chạy song song -> Judge ngồi gom hàng.
- **Điểm xuất phát:** Thiết lập một Backend vững chắc với Socket.io vì tôi biết bạn muốn thấy các Agent "đang làm việc" theo thời gian thực (real-time). Nếu không có Socket, cái App này sẽ chết lặng cho đến khi có kết quả cuối, trông sẽ rất "đần".

### Step 2: Những con đường tôi đã không đi
Tôi đã từng nghĩ đến việc để các Agent gọi nhau theo kiểu "nối đuôi" (Gemini xong mới tới DeepSeek). Nhưng như vậy thì chậm quá! Tôi quyết định dùng `Promise.all` để ép chúng làm việc đồng thời. 
Tôi cũng định dùng SDK chính hãng của Google cho Gemini. Nhưng sau 3-4 lần lỗi 404 vì model không khớp version, tôi đã quyết định "vứt xó" cái thư viện đó để dùng `native fetch`. Đó là một quyết định mạo hiểm nhưng lại là cứu cánh giúp chúng ta kết nối thẳng vào lõi API của Google mà không bị rào cản thư viện.

### Step 3: Các mảnh ghép kết nối thế nào?
- **Backend (Trái tim):** Chứa luật chơi (Global Prompt) và logic chuyển đổi dự phòng (Fallback). 
- **Frontend (Gương mặt):** Dùng React để phản ứng cực nhanh với các tín hiệu từ Socket.
- **CSS Vanilla (Phong cách):** Không dùng Tailwind vì tôi muốn kiểm soát từng pixel. Tôi đã dùng "Glassmorphism" (hiệu ứng kính mờ) để giao diện trông premium như các app của Apple vậy.

### Step 4: Công cụ và "khung suy nghĩ"
Tôi dùng `kill-port` như một thanh kiếm để "trảm" các tiến trình cũ bị treo trên Windows. Ở môi trường Windows, tiến trình Node đôi khi rất lỳ lợm, không chịu tắt dù bạn đã đóng terminal. Nếu không dùng công cụ này, chúng ta sẽ mãi mãi dính ở cái Server cũ lỗi thời.

### Step 5: Những sự đánh đổi
Tôi đã đánh đổi sự tiện lợi của DeepSeek API gốc (vì nó đang bị hết tiền) để lấy sự phức tạp của OpenRouter. Việc phải viết thêm hàng tá Header (`HTTP-Referer`, `X-Title`) khiến code dài hơn, nhưng bù lại, nó ĐẢM BẢO bạn có kết quả trả về. Tôi ưu tiên "kết quả cuối cùng" hơn là "code ngắn".

### Step 6: Những mớ hỗn độn (Messy Part)
Trời ơi, cái mớ model names! `llama3-70b` rồi lại `llama-3.1-8b`, hay `gemini-pro` rồi lại `gemini-1.5-flash`. Các hãng AI cập nhật tên model nhanh như người yêu cũ lật mặt vậy. Tôi đã bị "việt vị" vài lần khi gọi nhầm tên model đã bị khai tử. Nhưng chính việc nhìn vào đống Log đỏ rực đó đã giúp tôi tìm ra đúng model `llama-3.1-8b-instant` đang trực chiến.

### Step 7: Lời khuyên "Giá như..."
Giá mà có người nói với bạn sớm hơn: "Đừng bao giờ tin hoàn toàn vào SDK". Đôi khi cứ dùng phương thức thô sơ nhất (`fetch` REST API) lại là cách ổn định nhất khi làm việc với các hệ thống AI đang thay đổi hàng ngày.

### Step 8: Góc nhìn chuyên gia
Một người mới sẽ thấy các nút bấm và màu sắc. Một chuyên gia (như bạn sau dự án này) sẽ nhìn vào cái **State Management**. Khi bạn thấy Gemini lỗi mà Groq tự nhảy vào thay thế (Fallback), đó chính là đỉnh cao của hệ thống phân tán. Nó không bao giờ đổ vỡ hoàn toàn, nó luôn có phương án B.

### Step 9: Bài học cho mai sau
Dự án này dạy chúng ta rằng: **Giao diện chỉ là bề nổi, sự phối hợp (Orchestration) mới là tảng băng chìm**. Việc kết nối 5-6 con AI khác nhau vào một mối không khó bằng việc dạy chúng "nhường nhịn" và "thay thế" nhau khi có sự cố.

Hy vọng bạn cảm thấy mình thông minh hơn và "ngầu" hơn sau khi cùng tôi xây dựng Total AI. Chúc bạn có những chiến dịch marketing spa thật bùng nổ với đàn con AI này nhé!
