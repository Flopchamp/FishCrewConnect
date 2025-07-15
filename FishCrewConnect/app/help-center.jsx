import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import SafeScreenWrapper from '../components/SafeScreenWrapper';
import HeaderBox from '../components/HeaderBox';
import helpContent from '../services/helpContent';

const HelpCenter = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedContent, setSelectedContent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSections, setFilteredSections] = useState([]);

  // Get user-specific help content
  const getUserHelpContent = () => {
    if (user?.user_type === 'admin') {
      return helpContent.admin;
    } else if (user?.user_type === 'boat_owner') {
      return helpContent.boatOwner;
    } else if (user?.user_type === 'fisherman') {
      return helpContent.fisherman;
    }
    return helpContent.common;
  };

  const userContent = getUserHelpContent();

  useEffect(() => {
    // Filter sections based on search query
    if (searchQuery.trim() === '') {
      setFilteredSections(userContent.sections);
    } else {
      const filtered = userContent.sections.filter(section =>
        section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        section.content.some(item =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.content.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
      setFilteredSections(filtered);
    }
  }, [searchQuery, userContent]);

  const handleSectionPress = (section) => {
    setSelectedSection(section);
    setSelectedContent(null);
  };

  const handleContentPress = (content) => {
    setSelectedContent(content);
  };

  const handleBackPress = () => {
    if (selectedContent) {
      setSelectedContent(null);
    } else if (selectedSection) {
      setSelectedSection(null);
    } else {
      router.back();
    }
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
        'contact us on',
      [
        {
          text: 'In-App Form',
          onPress: () => router.push('/support-form')
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const renderMainView = () => (
    <ScrollView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#6b7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search help topics..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9ca3af"
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Quick Help</Text>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={handleContactSupport}
          >
            <Ionicons name="call-outline" size={24} color="#1e40af" />
            <Text style={styles.quickActionText}>Contact Support</Text>
          </TouchableOpacity>
          
        </View>
      </View>

      {/* Help Sections */}
      <Text style={styles.sectionTitle}>
        {userContent.title} - Help Topics
      </Text>
      
      {filteredSections.map((section) => (
        <TouchableOpacity
          key={section.id}
          style={styles.helpSectionCard}
          onPress={() => handleSectionPress(section)}
        >
          <View style={styles.helpSectionContent}>
            <Ionicons name={section.icon} size={24} color="#1e40af" style={styles.sectionIcon} />
            <View style={styles.sectionTextContainer}>
              <Text style={styles.sectionTitleText}>{section.title}</Text>
              <Text style={styles.sectionSubtext}>
                {section.content.length} topic{section.content.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={20} color="#6b7280" />
          </View>
        </TouchableOpacity>
      ))}

      {/* Common Help Topics */}
      {userContent !== helpContent.common && (
        <>
          <Text style={styles.sectionTitle}>General Help</Text>
          {helpContent.common.sections.map((section) => (
            <TouchableOpacity
              key={`common-${section.id}`}
              style={styles.helpSectionCard}
              onPress={() => handleSectionPress(section)}
            >
              <View style={styles.helpSectionContent}>
                <Ionicons name={section.icon} size={24} color="#6b7280" style={styles.sectionIcon} />
                <View style={styles.sectionTextContainer}>
                  <Text style={styles.sectionTitleText}>{section.title}</Text>
                  <Text style={styles.sectionSubtext}>
                    {section.content.length} topic{section.content.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={20} color="#6b7280" />
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}
    </ScrollView>
  );

  const renderSectionView = () => (
    <ScrollView style={styles.container}>
      <Text style={styles.pageTitle}>{selectedSection.title}</Text>
      
      {selectedSection.content.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles.contentCard}
          onPress={() => handleContentPress(item)}
        >
          <View style={styles.contentCardHeader}>
            <Text style={styles.contentTitle}>{item.title}</Text>
            <Ionicons name="chevron-forward-outline" size={20} color="#6b7280" />
          </View>
          <Text style={styles.contentPreview} numberOfLines={2}>
            {item.content.substring(0, 100)}...
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderContentView = () => (
    <ScrollView style={styles.container}>
      <Text style={styles.pageTitle}>{selectedContent.title}</Text>
      <View style={styles.contentDetailCard}>
        <Text style={styles.contentDetailText}>{selectedContent.content}</Text>
      </View>
      
      {/* Was this helpful section */}
      <View style={styles.feedbackContainer}>
        <Text style={styles.feedbackTitle}>Was this helpful?</Text>
        <View style={styles.feedbackButtons}>
          <TouchableOpacity 
            style={[styles.feedbackButton, styles.feedbackButtonYes]}
            onPress={() => Alert.alert('Thank you!', 'We\'re glad this was helpful.')}
          >
            <Ionicons name="thumbs-up-outline" size={20} color="#059669" />
            <Text style={[styles.feedbackButtonText, { color: '#059669' }]}>Yes</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.feedbackButton, styles.feedbackButtonNo]}
            onPress={() => Alert.alert('Feedback', 'Thank you for your feedback. Please contact support for additional help.')}
          >
            <Ionicons name="thumbs-down-outline" size={20} color="#dc2626" />
            <Text style={[styles.feedbackButtonText, { color: '#dc2626' }]}>No</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const getHeaderTitle = () => {
    if (selectedContent) return selectedContent.title;
    if (selectedSection) return selectedSection.title;
    return 'Help Center';
  };

  return (
    <SafeScreenWrapper>
      <HeaderBox
        title={getHeaderTitle()}
        showBackButton={true}
        onBackPress={handleBackPress}
        rightComponent={
          <TouchableOpacity onPress={handleContactSupport}>
            <Ionicons name="call-outline" size={24} color="#1e40af" />
          </TouchableOpacity>
        }
      />
      
      {selectedContent
        ? renderContentView()
        : selectedSection
        ? renderSectionView()
        : renderMainView()
      }
    </SafeScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  quickActionsContainer: {
    marginBottom: 24,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  quickActionButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    flex: 0.48,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  quickActionText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    marginTop: 8,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 20,
  },
  helpSectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  helpSectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: 16,
  },
  sectionTextContainer: {
    flex: 1,
  },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  sectionSubtext: {
    fontSize: 14,
    color: '#6b7280',
  },
  contentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  contentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  contentPreview: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  contentDetailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  contentDetailText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1f2937',
  },
  feedbackContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  feedbackButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  feedbackButtonYes: {
    borderColor: '#059669',
    backgroundColor: '#f0fdf4',
  },
  feedbackButtonNo: {
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  feedbackButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default HelpCenter;
