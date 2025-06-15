import React from 'react';
import { Text } from 'react-native';

/**
 * This custom hook provides wrapped text components for navigation elements
 * to avoid "Text strings must be rendered within a <Text> component" errors.
 * 
 * @returns {Object} Object containing wrapped text components for navigation
 */
export const useMonocleTexts = () => {
  const ScreenText = React.useCallback(({ children }) => {
    return React.Children.toArray(children).map((child, i) => {
      if (typeof child === 'string' || typeof child === 'number') {
        return <Text key={i}>{child}</Text>;
      }
      return child;
    });
  }, []);

  return { ScreenText };
};

export default useMonocleTexts;
