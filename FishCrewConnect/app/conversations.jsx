import React from 'react';
import { Redirect } from 'expo-router';

// This file now redirects to the tab version
const ConversationsScreen = () => {
  return <Redirect href="/(tabs)/conversations" />;
};

export default ConversationsScreen;
