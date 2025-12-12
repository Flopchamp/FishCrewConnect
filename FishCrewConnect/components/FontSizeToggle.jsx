import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const STORAGE_KEY = 'fcc_font_size_scale';

/**
 * FontSizeToggle
 * - Lightweight component to choose an app-wide font scale
 * - Persists selection in AsyncStorage and calls onChange(scale)
 *
 * Props:
 *  - initialScale?: number (default 1.0)
 *  - onChange?: (scale: number) => void
 */
const FontSizeToggle = ({ initialScale = 1.0, onChange = () => {} }) => {
  const [scale, setScale] = useState(initialScale);
  const options = [0.9, 1.0, 1.1, 1.2];

  useEffect(() => {
    // load saved scale
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = parseFloat(raw);
          if (!isNaN(parsed)) {
            setScale(parsed);
            onChange(parsed);
          }
        }
      } catch (err) {
        // ignore storage errors; fallback to initialScale
        console.warn('FontSizeToggle: failed to load scale', err);
      }
    })();
  }, []);

  const updateScale = async (next) => {
    try {
      setScale(next);
      await AsyncStorage.setItem(STORAGE_KEY, String(next));
      onChange(next);
    } catch (err) {
      console.warn('FontSizeToggle: failed to save scale', err);
    }
  };

  return (
    <View style={styles.container} accessible accessibilityRole="toolbar">
      <Text style={[styles.label]}>Font size</Text>

      <View style={styles.row}>
        {options.map((opt) => {
          const active = Math.abs(opt - scale) < 0.001;
          return (
            <TouchableOpacity
              key={String(opt)}
              style={[styles.button, active && styles.buttonActive]}
              onPress={() => updateScale(opt)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Set font size ${opt}`}
            >
              <Text style={[styles.buttonText, active && styles.buttonTextActive]}>A</Text>
              {active && (
                <Ionicons name="checkmark-circle" size={14} color="#0ea5a4" style={styles.checkIcon} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.preview, { transform: [{ scale }] }]} numberOfLines={1}>
        Preview: The quick brown fox jumps over the lazy dog
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    flexDirection: 'row',
  },
  buttonActive: {
    borderColor: '#0ea5a4',
    backgroundColor: '#ECFEFF',
  },
  buttonText: {
    fontSize: 18,
    color: '#374151',
    fontWeight: '700',
  },
  buttonTextActive: {
    color: '#0f766e',
  },
  checkIcon: {
    marginLeft: 6,
  },
  preview: {
    marginTop: 10,
    fontSize: 14,
    color: '#374151',
  },
});

export default FontSizeToggle;
