import React from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DefaultProfileImage from './DefaultProfileImage';

/**
 * ProfileCard Component - Display user profile summary in a card format
 * @param {object} user - The user profile data
 * @param {function} onPress - Function to call when the card is pressed
 * @param {boolean} showRating - Whether to show the user's rating
 */
const ProfileCard = ({ user, onPress, showRating = true }) => {
  // Handle null/undefined user object
  if (!user) {
    return null;
  }
  
  // Check if user has a profile image
  const hasProfileImage = user && user.profile_image;

  // Format experience text
  const formatExperience = (years) => {
    if (!years && years !== 0) return 'Experience not specified';
    if (years < 1) return 'Less than 1 year';
    return years === 1 ? '1 year experience' : `${years} years experience`;
  };

  // Safely get values with fallbacks
  const name = user.name || 'Name not specified';
  const location = user.location || 'Location not specified';
  const rating = user.rating || 'N/A';
  const available = user.available !== undefined ? user.available : true;
  
  // Safely handle arrays
  const specialties = Array.isArray(user.specialties) ? user.specialties : [];
  const skills = Array.isArray(user.skills) ? user.skills : [];
  
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        {hasProfileImage ? (
          <Image source={{ uri: user.profile_image }} style={styles.profileImage} />
        ) : (
          <View style={styles.profileImageContainer}>
            <DefaultProfileImage size={80} />
          </View>
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{name}</Text>
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.locationText}>{location}</Text>
          </View>
        </View>
        {showRating && (
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>{rating}</Text>
            <Ionicons name="star" size={12} color="#FFC107" />
          </View>
        )}
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Ionicons name="boat-outline" size={16} color="#666" />
          <Text style={styles.infoText}>{formatExperience(user.years_experience)}</Text>
        </View>
        {specialties.length > 0 && (
          <View style={styles.infoItem}>
            <Ionicons name="fish-outline" size={16} color="#666" />
            <Text style={styles.infoText} numberOfLines={1}>
              {specialties.join(', ')}
            </Text>
          </View>
        )}
      </View>

      {skills.length > 0 && (
        <View style={styles.skillsContainer}>
          {skills.slice(0, 3).map((skill, index) => (
            <View key={index} style={styles.skillBadge}>
              <Text style={styles.skillText}>{skill}</Text>
            </View>
          ))}
          {skills.length > 3 && (
            <View style={styles.skillBadge}>
              <Text style={styles.skillText}>+{skills.length - 3}</Text>
            </View>
          )}
        </View>
      )}
      
      <View style={styles.footer}>
        <Text style={styles.availabilityText}>
          {available ? 'Available Now' : 'Not Available'}
        </Text>
        <View style={styles.contactButton}>
          <Ionicons name="chatbubble-outline" size={16} color="#44DBE9" />
          <Text style={styles.contactText}>Contact</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E1E1E1', // Placeholder color
  },
  profileImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    marginLeft: 4,
    color: '#666',
    fontSize: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    padding: 4,
    borderRadius: 4,
  },
  ratingText: {
    marginRight: 2,
    fontWeight: 'bold',
    fontSize: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  infoText: {
    marginLeft: 4,
    color: '#444',
    fontSize: 13,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  skillBadge: {
    backgroundColor: '#E8F5F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 6,
  },
  skillText: {
    color: '#44DBE9',
    fontSize: 12,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  availabilityText: {
    color: '#666',
    fontSize: 13,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    marginLeft: 4,
    color: '#44DBE9',
    fontWeight: '500',
  },
});

export default ProfileCard;
