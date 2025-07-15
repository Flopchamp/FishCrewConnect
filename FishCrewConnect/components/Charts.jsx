import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Svg, Rect, Line, Circle, Path, G, Text as SvgText } from 'react-native-svg';

const screenWidth = Dimensions.get('window').width;

// Helper function to truncate text based on available width
const truncateText = (text, maxWidth, fontSize = 10) => {
  if (!text) return '';
  const textStr = text.toString().trim();
  if (!textStr) return '';
  
  const avgCharWidth = fontSize * 0.55; // More accurate character width estimation
  const maxChars = Math.floor(maxWidth / avgCharWidth);
  
  if (textStr.length <= maxChars) return textStr;
  if (maxChars <= 3) return textStr.substring(0, 1) + '..';
    // Smart truncation - try to break at word boundaries or common separators
  if (maxChars > 8) {
    const separators = [' ', '-', '_', '/'];
    for (let separator of separators) {
      if (textStr.includes(separator)) {
        const parts = textStr.split(separator);
        if (parts.length > 1) {
          let result = '';
          for (let part of parts) {
            const testResult = result + (result ? separator : '') + part;
            if (testResult.length <= maxChars - 3) {
              result = testResult;
            } else {
              break;
            }
          }
          if (result && result !== textStr) return result + '...';
        }
      }
    }
  }
  
  // For very short space, try abbreviations with space separators
  if (maxChars <= 10 && textStr.includes(' ')) {
    const words = textStr.split(' ');
    if (words.length > 1) {
      // Try first letters abbreviation
      const abbrev = words.map(word => word[0]).join('');
      if (abbrev.length <= maxChars) return abbrev.toUpperCase();
      
      // Try first word + first letter of others
      const firstWord = words[0];
      const otherLetters = words.slice(1).map(word => word[0]).join('');
      const hybrid = firstWord + otherLetters;
      if (hybrid.length <= maxChars) return hybrid;
    }
  }
  
  return textStr.substring(0, maxChars - 3) + '...';
};

// Simple Bar Chart Component
export const SimpleBarChart = ({ data, width = screenWidth - 64, height = 220, config = {} }) => {
  // Enhanced validation for data structure
  if (!data || typeof data !== 'object' ||
      !data.datasets || !Array.isArray(data.datasets) ||
      !data.datasets[0] || typeof data.datasets[0] !== 'object' ||
      !data.datasets[0].data || !Array.isArray(data.datasets[0].data) ||
      data.datasets[0].data.length === 0) {
    return (
      <View style={[styles.chartContainer, { width, height }]}>
        <Text style={styles.noDataText}>No data available</Text>
      </View>
    );
  }

  const labels = Array.isArray(data.labels) ? data.labels : [];
  const rawValues = Array.isArray(data.datasets[0].data) ? data.datasets[0].data : [];
  
  // Enhanced number validation and sanitization
  const values = rawValues.map((val, index) => {
    let numericValue = 0;
    
    // Handle different input types more robustly
    if (val === null || val === undefined) {
      return 0;
    }
    
    if (typeof val === 'number') {
      if (!isNaN(val) && isFinite(val)) {
        numericValue = val;
      }
    } else if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed !== '') {
        const parsed = parseFloat(trimmed);
        if (!isNaN(parsed) && isFinite(parsed)) {
          numericValue = parsed;
        }
      }
    } else if (typeof val === 'object' && val !== null) {
      // Handle objects that might have a numeric property
      const possibleKeys = ['value', 'count', 'total', 'amount'];
      for (const key of possibleKeys) {
        if (key in val) {
          const subVal = val[key];
          if (typeof subVal === 'number' && !isNaN(subVal) && isFinite(subVal)) {
            numericValue = subVal;
            break;
          }
        }
      }
    }
    
    // Ensure the result is a valid, non-negative number
    return Math.max(0, Math.floor(numericValue));
  });  
  // Final validation - ensure we have valid data to render
  if (values.length === 0 || values.every(val => val === 0)) {
    return (
      <View style={[styles.chartContainer, { width, height }]}>
        <Text style={styles.noDataText}>No valid data available</Text>
      </View>
    );
  }
    // Ensure labels and data arrays have the same length and are valid
  const minLength = Math.min(labels.length, values.length);
  const finalLabels = labels.slice(0, minLength).map(label => 
    (label === null || label === undefined) ? 'Unknown' : String(label)
  );
  const finalValues = values.slice(0, minLength).map(val => 
    (typeof val === 'number' && !isNaN(val) && isFinite(val)) ? Math.max(0, val) : 0
  );
  
  // Ensure we have at least one valid data point
  if (finalLabels.length === 0 || finalValues.length === 0 || finalValues.every(val => val === 0)) {
    return (
      <View style={[styles.chartContainer, { width, height }]}>
        <Text style={styles.noDataText}>No valid data to display</Text>
      </View>
    );
  }
  
  const maxValue = Math.max(...finalValues, 1); // Ensure maxValue is at least 1
  const numBars = finalValues.length;
  
  // Validate dimensions to prevent NaN in calculations
  if (!width || !height || width <= 0 || height <= 0 || numBars <= 0) {
    return (
      <View style={[styles.chartContainer, { width, height }]}>
        <Text style={styles.noDataText}>Invalid chart dimensions</Text>
      </View>
    );
  }
  
  // Calculate dimensions with better spacing
  const leftMargin = 50;
  const rightMargin = 20;
  const topMargin = 40;
  const bottomMargin = 80; // More space for labels
  
  const chartWidth = width - leftMargin - rightMargin;
  const chartHeight = height - topMargin - bottomMargin;
  const barWidth = chartWidth / numBars;
    // Improved label logic
  const maxLabelLength = Math.max(...finalLabels.map(l => l?.toString().length || 0));
  
  // Better conditions for rotation
  const shouldRotateLabels = numBars > 4 || maxLabelLength > 8 || barWidth < 60;
  
  // Dynamic font sizing
  let labelFontSize;
  if (shouldRotateLabels) {
    labelFontSize = Math.max(9, Math.min(12, Math.min(barWidth / 3, 12)));
  } else {
    labelFontSize = Math.max(8, Math.min(11, barWidth / 6));
  }
  
  // Better max width calculation
  const labelMaxWidth = shouldRotateLabels ? 60 : barWidth * 0.9;
  return (
    <View style={[styles.chartContainer, { width, height }]}>
      <Svg width={width} height={height}>        {/* Draw bars */}
        {finalValues.map((value, index) => {
          const barHeight = maxValue > 0 ? (value / maxValue) * chartHeight : 0;
          const x = leftMargin + index * barWidth + barWidth * 0.15;
          const y = topMargin + chartHeight - barHeight;
          const actualBarWidth = barWidth * 0.7;
          
          return (
            <G key={index}>
              <Rect
                x={x}
                y={y}
                width={actualBarWidth}
                height={Math.max(0, barHeight)}
                fill={config.color ? config.color(1) : '#007AFF'}
                rx={3}
              />
              {/* Bar value on top */}
              <SvgText
                x={x + actualBarWidth / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize={Math.min(10, labelFontSize)}
                fill="#333"
                fontWeight="500"
              >
                {(() => {
                  const val = typeof value === 'number' && !isNaN(value) ? value.toLocaleString() : '0';
                  return String(val || '0');
                })()}
              </SvgText>
            </G>
          );
        })}
          {/* Labels at bottom */}
        {finalLabels.map((label, index) => {
          const barCenterX = leftMargin + index * barWidth + barWidth * 0.5;
          const labelText = truncateText(label?.toString() || '', labelMaxWidth, labelFontSize);
          const labelY = height - bottomMargin + 15;
          
          if (shouldRotateLabels) {
            return (
              <SvgText
                key={`label-${index}`}
                x={barCenterX}
                y={labelY}
                textAnchor="end"
                fontSize={labelFontSize}
                fill="#666"
                fontWeight="400"
                transform={`rotate(-40, ${barCenterX}, ${labelY})`}
              >
                {String(labelText || '')}
              </SvgText>
            );
          } else {
            // For horizontal labels, check if we need to split into multiple lines
            const words = labelText.split(' ');
            if (words.length > 2 && labelText.length > 12) {
              // Multi-line label
              const midPoint = Math.ceil(words.length / 2);
              const line1 = words.slice(0, midPoint).join(' ');
              const line2 = words.slice(midPoint).join(' ');
              
              return (
                <G key={`label-${index}`}>
                  <SvgText
                    x={barCenterX}
                    y={labelY - 6}
                    textAnchor="middle"
                    fontSize={labelFontSize - 1}
                    fill="#666"
                    fontWeight="400"
                  >
                    {String(line1 || '')}
                  </SvgText>
                  <SvgText
                    x={barCenterX}
                    y={labelY + 6}
                    textAnchor="middle"
                    fontSize={labelFontSize - 1}
                    fill="#666"
                    fontWeight="400"
                  >
                    {String(line2 || '')}
                  </SvgText>
                </G>
              );
            } else {
              return (
                <SvgText
                  key={`label-${index}`}
                  x={barCenterX}
                  y={labelY}
                  textAnchor="middle"
                  fontSize={labelFontSize}
                  fill="#666"
                  fontWeight="400"
                >
                  {String(labelText || '')}
                </SvgText>
              );
            }
          }
        })}
        
        {/* Y-axis */}
        <Line
          x1={leftMargin}
          y1={topMargin}
          x2={leftMargin}
          y2={topMargin + chartHeight}
          stroke="#e0e0e0"
          strokeWidth={1}
        />
        
        {/* X-axis */}
        <Line
          x1={leftMargin}
          y1={topMargin + chartHeight}
          x2={leftMargin + chartWidth}
          y2={topMargin + chartHeight}
          stroke="#e0e0e0"
          strokeWidth={1}
        />
        
        {/* Grid lines for better readability */}
        {[0.25, 0.5, 0.75].map((ratio, index) => {
          const y = topMargin + chartHeight * (1 - ratio);
          return (
            <Line
              key={`grid-${index}`}
              x1={leftMargin}
              y1={y}
              x2={leftMargin + chartWidth}
              y2={y}
              stroke="#f5f5f5"
              strokeWidth={1}
            />
          );
        })}
      </Svg>
    </View>
  );
};

// Simple Line Chart Component
export const SimpleLineChart = ({ data, width = screenWidth - 64, height = 220, config = {} }) => {
  // Enhanced validation for data structure
  if (!data || typeof data !== 'object' ||
      !data.datasets || !Array.isArray(data.datasets) ||
      !data.datasets[0] || typeof data.datasets[0] !== 'object' ||
      !data.datasets[0].data || !Array.isArray(data.datasets[0].data) ||
      data.datasets[0].data.length === 0) {
    return (
      <View style={[styles.chartContainer, { width, height }]}>
        <Text style={styles.noDataText}>No data available</Text>
      </View>
    );
  }

  const labels = Array.isArray(data.labels) ? data.labels : [];
  const values = Array.isArray(data.datasets[0].data) ? data.datasets[0].data : [];
  
  // Enhanced value validation and sanitization
  const validValues = values.map((val, index) => {
    let numericValue = 0;
    
    if (val === null || val === undefined) {
      return 0;
    }
    
    if (typeof val === 'number') {
      if (!isNaN(val) && isFinite(val)) {
        numericValue = val;
      }
    } else if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed !== '') {
        const parsed = parseFloat(trimmed);
        if (!isNaN(parsed) && isFinite(parsed)) {
          numericValue = parsed;
        }
      }
    }
    
    // Return finite number, default to 0 for any invalid values
    return isFinite(numericValue) ? numericValue : 0;
  });  
  if (validValues.length === 0) {
    return (
      <View style={[styles.chartContainer, { width, height }]}>
        <Text style={styles.noDataText}>No valid data available</Text>
      </View>
    );
  }
  
  // Calculate range with additional safety checks
  const maxValue = Math.max(...validValues);
  const minValue = Math.min(...validValues);
  const valueRange = maxValue - minValue;
  
  // Validate dimensions and ranges
  if (!width || !height || width <= 0 || height <= 0) {
    return (
      <View style={[styles.chartContainer, { width, height }]}>
        <Text style={styles.noDataText}>Invalid chart dimensions</Text>
      </View>
    );
  }
  
  // Ensure all calculated values are finite
  if (!isFinite(maxValue) || !isFinite(minValue) || !isFinite(valueRange)) {
    return (
      <View style={[styles.chartContainer, { width, height }]}>
        <Text style={styles.noDataText}>Invalid data range</Text>
      </View>
    );
  }
  
  const chartWidth = width - 80;
  const chartHeight = height - 80;
  
  // Handle single data point case
  const stepX = validValues.length > 1 ? chartWidth / (validValues.length - 1) : 0;
  // Create path for line with enhanced validation
  let pathData = '';
  const points = validValues.map((value, index) => {
    let x, y;
    
    // Handle single point case
    if (validValues.length === 1) {
      x = 40 + chartWidth / 2; // Center horizontally
    } else {
      x = 40 + index * stepX;
    }
    
    // Additional validation for x coordinate
    if (!isFinite(x) || isNaN(x)) {
      x = 40 + chartWidth / 2;
    }
    
    // Handle case where all values are the same (valueRange = 0)
    if (valueRange === 0) {
      y = 40 + chartHeight / 2; // Center the line
    } else {
      y = 40 + chartHeight - ((value - minValue) / valueRange) * chartHeight;
    }
    
    // Enhanced validation for y coordinate
    if (!isFinite(y) || isNaN(y)) {
      y = 40 + chartHeight / 2;
    }
    
    // Ensure coordinates are within reasonable bounds and finite
    x = Math.max(40, Math.min(isFinite(x) ? x : 40 + chartWidth / 2, width - 40));
    y = Math.max(40, Math.min(isFinite(y) ? y : 40 + chartHeight / 2, height - 40));
    
    // Double-check that final coordinates are valid numbers
    if (!isFinite(x) || !isFinite(y) || isNaN(x) || isNaN(y)) {
      x = 40 + chartWidth / 2;
      y = 40 + chartHeight / 2;
    }
    
    // Build path data with validated coordinates
    if (index === 0) {
      pathData += `M ${x} ${y}`;
    } else {
      pathData += ` L ${x} ${y}`;
    }
    
    return { x, y, value };
  });

  // Final validation of path data before rendering
  if (!pathData || pathData.includes('NaN') || pathData.includes('Infinity') || 
      pathData.includes('undefined') || pathData.includes('null')) {
    return (
      <View style={[styles.chartContainer, { width, height }]}>
        <Text style={styles.noDataText}>Chart rendering error</Text>
      </View>
    );
  }

  // Validate all points before rendering
  const validPoints = points.filter(point => 
    point && 
    isFinite(point.x) && isFinite(point.y) && 
    !isNaN(point.x) && !isNaN(point.y)
  );
  
  if (validPoints.length === 0) {
    return (
      <View style={[styles.chartContainer, { width, height }]}>
        <Text style={styles.noDataText}>No valid chart points</Text>
      </View>
    );
  }

  return (
    <View style={[styles.chartContainer, { width, height }]}>
      <Svg width={width} height={height}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const y = 40 + ratio * chartHeight;
          return (
            <Line
              key={index}
              x1={40}
              y1={y}
              x2={width - 20}
              y2={y}
              stroke="#f0f0f0"
              strokeWidth={1}
            />
          );
        })}
        
        {/* Line path */}
        <Path
          d={pathData}
          fill="none"
          stroke={config.color ? config.color(1) : '#007AFF'}
          strokeWidth={config.strokeWidth || 3}
        />          {/* Data points - using validated points */}
        {validPoints.map((point, index) => {
          const labelText = truncateText(labels[index] || '', 60, 9);
          
          return (
            <G key={index}>
              <Circle
                cx={point.x}
                cy={point.y}
                r={4}
                fill={config.color ? config.color(1) : '#007AFF'}
                stroke="#fff"
                strokeWidth={2}
              />
              {/* Label at bottom */}
              <SvgText
                x={point.x}
                y={height - 12}
                textAnchor="middle"
                fontSize="9"
                fill="#555"
                fontWeight="500"
              >
                {String(labelText || '')}
              </SvgText>
            </G>
          );
        })}
        
        {/* Axes */}
        <Line x1={40} y1={40} x2={40} y2={height - 40} stroke="#ddd" strokeWidth={1} />
        <Line x1={40} y1={height - 40} x2={width - 20} y2={height - 40} stroke="#ddd" strokeWidth={1} />
      </Svg>
    </View>
  );
};

// Simple Pie Chart Component
export const SimplePieChart = ({ data, width = screenWidth - 64, height = 220 }) => {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.chartContainer, { width, height }]}>
        <Text style={styles.noDataText}>No data available</Text>
      </View>
    );
  }

  // Validate and sanitize data first
  const validData = data.filter(item => 
    item && 
    typeof item.population === 'number' && 
    !isNaN(item.population) && 
    item.population > 0
  );

  if (validData.length === 0) {
    return (
      <View style={[styles.chartContainer, { width, height }]}>
        <Text style={styles.noDataText}>No valid data to display</Text>
      </View>
    );
  }

  const total = validData.reduce((sum, item) => sum + item.population, 0);
  if (total === 0) {
    return (
      <View style={[styles.chartContainer, { width, height }]}>
        <Text style={styles.noDataText}>No data to display</Text>
      </View>
    );
  }

  const chartWidth = width * 0.6;
  const chartHeight = height - 20; // Account for padding
  const centerX = chartWidth / 2;
  const centerY = chartHeight / 2;
  const radius = Math.min(chartWidth, chartHeight) / 2.5; // Smaller radius for better fit
  
  // Validate centerX, centerY, and radius
  if (isNaN(centerX) || isNaN(centerY) || isNaN(radius) || radius <= 0) {
    return (
      <View style={[styles.chartContainer, { width, height }]}>
        <Text style={styles.noDataText}>Chart rendering error</Text>
      </View>
    );
  }
  
  let currentAngle = -Math.PI / 2; // Start from top (12 o'clock position)
  const slices = validData.map((item, index) => {
    const sliceAngle = (item.population / total) * 2 * Math.PI;
    
    // Validate sliceAngle
    if (isNaN(sliceAngle) || sliceAngle <= 0) {
      return {
        path: '',
        color: item.color || `hsl(${(index * 360 / validData.length)}, 70%, 50%)`,
        item,
        percentage: '0.0',
        isVisible: false
      };
    }
    
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    
    const x1 = centerX + radius * Math.cos(startAngle);
    const y1 = centerY + radius * Math.sin(startAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);
    
    // Validate all coordinates
    if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
      return {
        path: '',
        color: item.color || `hsl(${(index * 360 / validData.length)}, 70%, 50%)`,
        item,
        percentage: '0.0',
        isVisible: false
      };
    }
    
    const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;
    
    // Only create path if slice has meaningful size
    let pathData = '';
    if (sliceAngle > 0.001) { // Avoid tiny slices
      pathData = [
        `M ${centerX} ${centerY}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        'Z'
      ].join(' ');
    }
    
    currentAngle += sliceAngle;
    
    const percentage = ((item.population / total) * 100);
    
    return {
      path: pathData,
      color: item.color || `hsl(${(index * 360 / validData.length)}, 70%, 50%)`, // Default colors
      item,
      percentage: isNaN(percentage) ? '0.0' : percentage.toFixed(1),
      isVisible: sliceAngle > 0.001 && pathData !== ''
    };
  });

  return (
    <View style={[styles.chartContainer, { width, height }]}>
      <View style={styles.pieChartRow}>
        <View style={styles.pieChartSvg}>
          <Svg width={chartWidth} height={chartHeight}>
            {slices.filter(slice => slice.isVisible).map((slice, index) => (
              <Path
                key={index}
                d={slice.path}
                fill={slice.color}
                stroke="#fff"
                strokeWidth={2}
              />
            ))}
          </Svg>
        </View>
          <View style={styles.pieLegend}>
          {validData.map((item, index) => {
            const slice = slices[index];
            if (!slice || !slice.isVisible) return null;
            
            return (
              <View key={index} style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: slice.color }]} />
                <View style={styles.legendText}>
                  <Text style={styles.legendLabel}>{item.name || 'Unknown'}</Text>
                  <Text style={styles.legendValue}>
                    {typeof item.population === 'number' && !isNaN(item.population) 
                      ? item.population.toLocaleString() 
                      : '0'} ({slice.percentage}%)
                  </Text>
                </View>
              </View>
            );
          }).filter(Boolean)}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  pieChartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  pieChartSvg: {
    flex: 0.6,
  },
  pieLegend: {
    flex: 0.4,
    paddingLeft: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    flex: 1,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  legendValue: {
    fontSize: 10,
    color: '#666',
  },
});
