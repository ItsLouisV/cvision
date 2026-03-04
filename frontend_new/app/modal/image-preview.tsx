// app/modal/image-preview.tsx

import React from 'react';
import { 
  StyleSheet, 
  View, 
  Image, 
  TouchableOpacity, 
  Dimensions 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

export default function ImagePreviewModal() {
  const router = useRouter();
  const { uri } = useLocalSearchParams<{ uri: string }>();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Lớp nền mờ ảo phía sau */}
      <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />

      {/* Nút Đóng */}
      <TouchableOpacity 
        style={styles.closeButton} 
        onPress={() => router.back()}
      >
        <Ionicons name="close-circle" size={40} color="white" />
      </TouchableOpacity>

      {/* Hiển thị ảnh phóng to */}
      <View style={styles.imageContainer}>
        {uri ? (
          <Image 
            source={{ uri }} 
            style={styles.fullImage} 
            resizeMode="contain" 
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
    },
    imageContainer: {
        width: width,
        height: height * 0.7,
    },
    fullImage: {
        width: '100%',
        height: '100%',
    },
});