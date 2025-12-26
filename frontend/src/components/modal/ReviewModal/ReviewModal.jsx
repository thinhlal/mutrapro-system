import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, message, Space, Typography } from 'antd';
import toast from 'react-hot-toast';
import PropTypes from 'prop-types';
import RatingStars from '../../common/RatingStars/RatingStars';

const { TextArea } = Input;
const { Text } = Typography;

/**
 * Modal để customer rate task assignment, request, hoặc participant
 * @param {boolean} open - Modal open state
 * @param {function} onCancel - Callback khi cancel
 * @param {function} onConfirm - Callback khi submit review (rating, comment)
 * @param {boolean} loading - Loading state
 * @param {string} type - Loại review: 'task' | 'request' | 'participant'
 * @param {string} title - Title tùy chỉnh (optional)
 * @param {string} description - Description tùy chỉnh (optional)
 * @param {Object} existingReview - Review đã tồn tại (nếu có) - để hiển thị readonly
 */
const ReviewModal = ({
  open,
  onCancel,
  onConfirm,
  loading,
  type = 'task',
  title,
  description,
  existingReview,
}) => {
  const [form] = Form.useForm();
  const [rating, setRating] = useState(0);

  useEffect(() => {
    if (open) {
      if (existingReview) {
        // Nếu đã có review, hiển thị readonly
        form.setFieldsValue({
          rating: existingReview.rating,
          comment: existingReview.comment || '',
        });
        setRating(existingReview.rating);
      } else {
        // Reset form khi mở modal mới
        form.resetFields();
        setRating(0);
      }
    }
  }, [open, existingReview, form]);

  const handleOk = async () => {
    try {
      if (existingReview) {
        // Nếu đã có review, chỉ đóng modal
        onCancel?.();
        return;
      }

      const values = await form.validateFields();

      // Validate rating từ form values
      const formRating = values.rating || rating;
      if (!formRating || formRating < 1 || formRating > 5) {
        toast.error('Vui lòng chọn rating từ 1 đến 5 sao', { duration: 5000, position: 'top-center' });
        return;
      }

      await onConfirm({
        rating: formRating,
        comment: values.comment || '',
      });

      form.resetFields();
      setRating(0);
    } catch (error) {
      if (error.errorFields) {
        // Validation errors - already handled by Form
        return;
      }
      toast.error('Lỗi khi gửi review', { duration: 5000, position: 'top-center' });
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setRating(0);
    onCancel?.();
  };

  const getModalTitle = () => {
    if (title) return title;
    if (existingReview) {
      return 'Review của bạn';
    }
    switch (type) {
      case 'task':
        return 'Đánh giá Task Assignment';
      case 'request':
        return 'Đánh giá Request';
      case 'participant':
        return 'Đánh giá Artist';
      default:
        return 'Rate';
    }
  };

  const getModalDescription = () => {
    if (description) return description;
    if (existingReview) {
      return 'You are already left a review. You can only view your review again.';
    }
    switch (type) {
      case 'task':
        return 'Vui lòng đánh giá chất lượng công việc của specialist cho task assignment này.';
      case 'request':
        return 'Vui lòng đánh giá tổng thể về trải nghiệm dịch vụ của request này.';
      case 'participant':
        return 'Vui lòng đánh giá chất lượng biểu diễn của artist này trong recording session.';
      default:
        return 'Vui lòng đánh giá.';
    }
  };

  return (
    <Modal
      title={getModalTitle()}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText={existingReview ? 'Đóng' : 'Gửi đánh giá'}
      cancelText="Hủy"
      width={600}
      okButtonProps={{ disabled: existingReview }}
    >
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        {getModalDescription()}
      </Text>

      <Form form={form} layout="vertical">
        <Form.Item
          name="rating"
          label="Rating"
          rules={[
            {
              required: !existingReview,
              message: 'Vui lòng chọn rating',
            },
          ]}
          valuePropName="value"
          getValueFromEvent={value => value}
        >
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <RatingStars
              value={rating}
              onChange={value => {
                setRating(value);
                form.setFieldsValue({ rating: value });
              }}
              disabled={existingReview}
            />
            {rating > 0 && !existingReview && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {rating} / 5 sao
              </Text>
            )}
          </Space>
        </Form.Item>

        <Form.Item
          name="comment"
          label="Comment (Tùy chọn)"
          rules={[
            {
              max: 1000,
              message: 'Comment không được vượt quá 1000 ký tự',
            },
          ]}
        >
          <TextArea
            rows={6}
            placeholder="Nhập feedback chi tiết của bạn (tùy chọn)..."
            maxLength={1000}
            showCount
            disabled={existingReview}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

ReviewModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onCancel: PropTypes.func,
  onConfirm: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  type: PropTypes.oneOf(['task', 'request', 'participant']),
  title: PropTypes.string,
  description: PropTypes.string,
  existingReview: PropTypes.shape({
    rating: PropTypes.number.isRequired,
    comment: PropTypes.string,
  }),
};

export default ReviewModal;
