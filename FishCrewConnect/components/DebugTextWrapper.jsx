import React from 'react';
import { View } from 'react-native';

/**
 * A wrapper component for debugging purposes
 * This component is used to wrap content that might be causing rendering issues
 */
const DebugTextWrapper = ({ children, style }) => {
  return (
    <View style={[{ flex: 1 }, style]}>
      {children}
    </View>
  );
};

export default DebugTextWrapper;
 