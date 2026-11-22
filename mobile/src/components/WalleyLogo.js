import React from 'react';
import Svg, { Rect, Path, Circle } from 'react-native-svg';

export default function WalleyLogo({ size = 38 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Rect width="40" height="40" rx="11" fill="#4361EE" />
      {/* Wallet Body */}
      <Rect x="9" y="12" width="22" height="17" rx="3.5" stroke="#FFFFFF" strokeWidth="2.2" />
      {/* Wallet Card Flap */}
      <Path
        d="M9 16C9 14.5 10.5 13 12 13H28C29.5 13 31 14.5 31 16"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Clasp / Card pocket */}
      <Path
        d="M23 18.5H29C30.1046 18.5 31 19.3954 31 20.5V23.5C31 24.6046 30.1046 25.5 29 25.5H23C21.8954 25.5 21 24.6046 21 23.5V20.5C21 19.3954 21.8954 18.5 23 18.5Z"
        fill="#4361EE"
        stroke="#FFFFFF"
        strokeWidth="2"
      />
      <Circle cx="25.5" cy="22" r="1.3" fill="#FFFFFF" />
    </Svg>
  );
}
