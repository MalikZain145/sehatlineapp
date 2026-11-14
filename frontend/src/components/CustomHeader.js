import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

const CustomHeader = ({ title, navigation, showBack = true }) => {
  return (
    <View style={styles.header}>
      {showBack && (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
      )}
      <Image 
        source={{ uri: 'https://i.imgur.com/5z3vX8K.png' }} // Replace with your logo URL if needed
        style={styles.logo}
      />
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#1E3A8A',
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.14, shadowRadius: 5.0, elevation: 5,
  },
  backButton: { marginRight: 15 },
  logo: { width: 40, height: 40, marginRight: 10 },
  title: { 
    color: '#fff', 
    fontSize: 20, 
    fontWeight: 'bold',
    flex: 1 
  },
});

export default CustomHeader;