import React from 'react';
import { Text } from 'react-native';

/**
 * A safe text component that ensures text is properly wrapped
 * This component helps prevent "Text strings must be rendered within a <Text> component" errors
 */
const SafeText = ({ children, style, ...props }) => {
  return (
    <Text style={style} {...props}>
      {children}
    </Text>
  );
};

export default SafeText;
