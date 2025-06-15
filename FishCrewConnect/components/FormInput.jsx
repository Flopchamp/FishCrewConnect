import React from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * FormInput Component - Customizable form input field
 * @param {string} label - Input field label
 * @param {string} value - Current input value
 * @param {function} onChangeText - Function to call when text changes
 * @param {string} placeholder - Placeholder text
 * @param {boolean} multiline - Whether the input is multiline
 * @param {string} errorText - Error message to display
 * @param {string} leftIcon - Name of Ionicons icon to display on left
 * @param {boolean} secureTextEntry - Whether to hide text input (for passwords)
 * @param {object} style - Additional custom styles
 * @param {object} inputProps - Additional props for TextInput
 */
const FormInput = ({ 
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  errorText,
  leftIcon,
  secureTextEntry = false,
  style = {},
  inputProps = {}
}) => {
  const [isFocused, setIsFocused] = React.useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = React.useState(!secureTextEntry);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={[
        styles.inputContainer,
        isFocused && styles.inputContainerFocused,
        errorText && styles.inputContainerError,
        multiline && styles.inputContainerMultiline
      ]}>
        {leftIcon && (
          <Ionicons 
            name={leftIcon} 
            size={18} 
            color={isFocused ? '#44DBE9' : '#999'} 
            style={styles.leftIcon}
          />
        )}
        
        <TextInput
          style={[
            styles.input,
            multiline && styles.inputMultiline
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#999"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          multiline={multiline}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          {...inputProps}
        />
        
        {secureTextEntry && (
          <TouchableOpacity 
            style={styles.passwordToggle}
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
          >
            <Ionicons 
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'} 
              size={20} 
              color="#999" 
            />
          </TouchableOpacity>
        )}
      </View>
      
      {errorText && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={14} color="#F44336" />
          <Text style={styles.errorText}>{errorText}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#444',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E1E1E1',
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 12,
  },
  inputContainerFocused: {
    borderColor: '#44DBE9',
    backgroundColor: '#FFFFFF',
  },
  inputContainerError: {
    borderColor: '#F44336',
  },
  inputContainerMultiline: {
    minHeight: 100,
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  leftIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 12,
  },
  inputMultiline: {
    height: 'auto',
    textAlignVertical: 'top',
  },
  passwordToggle: {
    padding: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginLeft: 4,
  },
});

export default FormInput;
