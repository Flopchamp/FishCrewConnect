import React from 'react';
import Svg, { Rect, Circle, Path } from 'react-native-svg';

/**
 * DefaultProfileImage Component - A fallback profile image using SVG
 * @param {number} size - Size of the profile image (width and height)
 * @param {string} style - Additional style props for the SVG
 */
const DefaultProfileImage = ({ size = 100, style = {} }) => {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      style={style}
    >
      <Rect width="200" height="200" fill="#E8F5F6" />
      <Circle cx="100" cy="80" r="40" fill="#44DBE9" opacity="0.7" />
      <Path d="M160 170C160 136.863 133.137 110 100 110C66.8629 110 40 136.863 40 170" stroke="#44DBE9" strokeWidth="20" />
    </Svg>
  );
};

export default DefaultProfileImage;
