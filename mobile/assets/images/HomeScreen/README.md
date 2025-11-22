# HomeScreen Slider Images

## Hướng dẫn thêm hình ảnh cho Image Slider

Thêm các hình ảnh sau vào thư mục này:

- `slide1.jpg` - Ảnh giới thiệu về dịch vụ transcription
- `slide2.jpg` - Ảnh giới thiệu về dịch vụ arrangement
- `slide3.jpg` - Ảnh giới thiệu về dịch vụ recording

### Yêu cầu kỹ thuật:
- **Kích thước khuyến nghị**: 1200x600px (tỷ lệ 2:1)
- **Định dạng**: JPG, PNG
- **Dung lượng**: < 500KB mỗi ảnh để tối ưu tốc độ load

### Cách sử dụng:

Sau khi thêm ảnh, cập nhật file `src/components/ImageSlider.js`:

```javascript
const SLIDER_DATA = [
  {
    id: '1',
    title: 'Professional Music Transcription',
    subtitle: 'Expert musicians transcribe your music with precision',
    image: require('../../assets/images/HomeScreen/slide1.jpg'), // Đổi đường dẫn này
    backgroundColor: COLORS.primary,
  },
  // ... tương tự cho các slide khác
];
```

### Gợi ý nội dung:

1. **Slide 1 - Transcription**
   - Hình ảnh: Nhạc cụ, bản nhạc, hoặc người đang chơi nhạc
   - Màu chủ đạo: Cam (#ec8a1c)

2. **Slide 2 - Arrangement**
   - Hình ảnh: Studio thu âm, mixing console, hoặc nhạc sĩ làm việc
   - Màu chủ đạo: Hồng (#FF6B9D)

3. **Slide 3 - Recording**
   - Hình ảnh: Microphone, headphones, hoặc phòng thu
   - Màu chủ đạo: Xanh lá (#28A745)

### Lưu ý:
- Hình ảnh nên có vùng tối ở phía dưới để text hiển thị rõ ràng
- Hoặc component sẽ tự động thêm gradient overlay đen từ trong suốt đến 70% opacity

