import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * CustomButton Component - Styled button with several variants
 * @param {string} title - Button text
 * @param {function} onPress - Function to call when button is pressed
 * @param {string} variant - Button style variant (primary, secondary, outline, danger)
 * @param {boolean} isLoading - Whether to show a loading spinner
 * @param {string} icon - Name of Ionicons icon to display
 * @param {object} style - Additional custom styles
 * @param {boolean} disabled - Whether the button is disabled
 * @param {boolean} fullWidth - Whether the button should take full width
 */
const CustomButton = ({
  title,
  onPress,
  variant = 'primary',
  isLoading = false,
  icon,
  style = {},
  disabled = false,
  fullWidth = false,
}) => {
  // Get container style based on variant
  const getContainerStyle = () => {
    switch (variant) {
      case 'secondary':
        return styles.secondaryContainer;
      case 'outline':
        return styles.outlineContainer;
      case 'danger':
        return styles.dangerContainer;
      case 'primary':
      default:
        return styles.primaryContainer;
    }
  };

  // Get text style based on variant
  const getTextStyle = () => {
    switch (variant) {
      case 'outline':
        return styles.outlineText;
      case 'danger':
        return styles.dangerText;
      case 'secondary':
      case 'primary':
      default:
        return styles.primaryText;
    }
  };

  // Get icon color based on variant
  const getIconColor = () => {
    switch (variant) {
      case 'outline':
        return '#44DBE9';
      case 'danger':
        return '#F44336';
      case 'secondary':
      case 'primary':
      default:
        return 'white';
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        getContainerStyle(),
        fullWidth && styles.fullWidth,
        disabled && styles.disabledContainer,
        style,
      ]}
      onPress={onPress}
      disabled={isLoading || disabled}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'danger' ? getIconColor() : 'white'}
        />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={16}
              color={getIconColor()}
              style={styles.icon}
            />
          )}
          <Text style={[
            styles.text,
            getTextStyle(),
            disabled && styles.disabledText,
          ]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 120,
  },
  fullWidth: {
    width: '100%',
  },
  primaryContainer: {
    backgroundColor: '#44DBE9',
  },
  secondaryContainer: {
    backgroundColor: '#E8F5F6',
  },
  outlineContainer: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#44DBE9',
  },
  dangerContainer: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  disabledContainer: {
    backgroundColor: '#E1E1E1',
    borderColor: '#E1E1E1',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryText: {
    color: 'white',
  },
  outlineText: {
    color: '#44DBE9',
  },
  dangerText: {
    color: '#F44336',
  },
  disabledText: {
    color: '#999',
  },
  icon: {
    marginRight: 8,
  },
});

export default CustomButton;
