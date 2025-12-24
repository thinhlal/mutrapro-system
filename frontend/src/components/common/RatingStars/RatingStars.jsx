import React from 'react';
import { Rate } from 'antd';
import PropTypes from 'prop-types';
import './RatingStars.css';

/**
 * Component hiển thị rating stars
 * @param {number} rating - Rating từ 1-5
 * @param {boolean} allowHalf - Cho phép chọn nửa sao
 * @param {boolean} disabled - Disable interaction
 * @param {number} size - Size của stars (default: 'default')
 * @param {function} onChange - Callback khi rating thay đổi
 * @param {number} value - Controlled value
 */
const RatingStars = ({
  rating,
  allowHalf = false,
  disabled = false,
  size = 'default',
  onChange,
  value,
}) => {
  // Determine the value to display
  // If value is provided (controlled), use it; otherwise use rating prop
  // Handle undefined/null/NaN by defaulting to 0
  const displayValue =
    value !== undefined
      ? value || 0
      : rating !== undefined && rating !== null && !isNaN(rating)
        ? rating
        : 0;

  return (
    <Rate
      value={displayValue}
      allowHalf={allowHalf}
      disabled={disabled}
      onChange={onChange}
      style={{ fontSize: size === 'small' ? 14 : size === 'large' ? 24 : 20 }}
    />
  );
};

RatingStars.propTypes = {
  rating: PropTypes.number,
  allowHalf: PropTypes.bool,
  disabled: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'default', 'large']),
  onChange: PropTypes.func,
  value: PropTypes.number,
};

export default RatingStars;
