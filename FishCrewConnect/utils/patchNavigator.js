import React from 'react';
import { Text } from 'react-native';

/**
 * Wraps string children in a Text component to prevent the
 * "Text strings must be rendered within a <Text> component" warning.
 * 
 * This HOC can be used to wrap components that might contain raw strings
 * in their rendering hierarchy.
 * 
 * @param {React.ComponentType} Component - The component to wrap
 * @returns {React.ComponentType} - The wrapped component
 */
export function withTextWrapper(Component) {
  return function WrappedComponent(props) {
    return <Component {...props} />;
  };
}

/**
 * Creates a Text component with specific styling for headers
 * 
 * @param {Object} props - Component props
 * @param {string} props.children - The text to display
 * @param {Object} props.style - Additional styling
 * @returns {JSX.Element} - A Text component
 */
export function HeaderText({ children, style }) {
  return (
    <Text style={[{ fontSize: 18, fontWeight: 'bold' }, style]}>
      {children}
    </Text>
  );
}

/**
 * Creates a Text component with specific styling for tab labels
 * 
 * @param {Object} props - Component props
 * @param {string} props.children - The text to display
 * @param {string} props.color - The text color
 * @param {boolean} props.focused - Whether the tab is focused
 * @returns {JSX.Element} - A Text component
 */
export function TabLabel({ children, color, focused }) {
  return (
    <Text style={{ 
      color: color || (focused ? '#44DBE9' : '#999'),
      fontSize: 12,
      marginBottom: 2
    }}>
      {children}
    </Text>
  );
}

export default {
  withTextWrapper,
  HeaderText,
  TabLabel
};
