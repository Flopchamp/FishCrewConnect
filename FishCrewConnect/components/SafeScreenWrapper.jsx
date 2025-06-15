import React from 'react';
import { View } from 'react-native';

/**
 * A wrapper component to help fix "Text strings must be rendered within a <Text> component" errors
 * This component is used to wrap screens or components that might be causing the error.
 */
const SafeScreenWrapper = ({ children, style }) => {
  return (
    <View style={[{ flex: 1 }, style]}>
      {children}
    </View>
  );
};

export default SafeScreenWrapper;
