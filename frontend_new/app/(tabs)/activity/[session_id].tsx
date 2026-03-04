import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Animated
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/themes';
import { BlurView } from 'expo-blur';
import axios from 'axios';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  content: string;
  timestamp: Date;
}

const InterviewScreen = () => {
  const { session_id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const accentColor = '#8e44ad';

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const ws = useRef<WebSocket | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const wsUrl = `ws://192.168.1.138:8000/api/v1/interview/ws/${session_id}`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => setIsConnected(true);
    ws.current.onclose = () => setIsConnected(false);

    ws.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setMessages(prev => [...prev, { 
        id: Math.random().toString(), 
        sender: 'ai', 
        content: data.content,
        timestamp: new Date()
      }]);
      setIsTyping(false);
    };

    return () => ws.current?.close();
  }, [session_id]);

  // Hiệu ứng mạch đập khi đang ghi âm
  useEffect(() => {
    if (recording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [recording]);

  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    if (!recording) return;
    setRecording(null);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI(); 
    if (uri) sendVoiceFile(uri);
  }

  const sendVoiceFile = async (uri: string) => {
    setIsProcessingVoice(true);
    try {
      const formData = new FormData();
      // @ts-ignore
      formData.append('file', { uri, type: 'audio/m4a', name: 'speech.m4a' });
      const res = await axios.post(`http://192.168.1.138:8000/api/v1/stt/convert`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.text) setInputText(res.data.text);
    } catch (e) {
      Alert.alert("Lỗi", "Không thể nhận diện giọng nói");
    } finally {
      setIsProcessingVoice(false);
    }
  };

  const sendMessage = () => {
    if (!inputText.trim() || !ws.current) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', content: inputText, timestamp: new Date() }]);
    ws.current.send(JSON.stringify({ type: 'answer', content: inputText }));
    setInputText('');
    setIsTyping(true);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.msgWrapper, isUser ? styles.userWrapper : styles.aiWrapper]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Ionicons name="sparkles" size={14} color="#fff" />
          </View>
        )}
        <View style={[
          styles.bubble, 
          isUser ? styles.userBubble : [styles.aiBubble, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]
        ]}>
          <Text style={[styles.msgText, { color: isUser ? '#fff' : theme.text }]}>{item.content}</Text>
          <Text style={[styles.timeText, { color: isUser ? 'rgba(255,255,255,0.7)' : '#8E8E93' }]}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Custom Header */}
      <BlurView intensity={isDark ? 30 : 50} tint={isDark ? 'dark' : 'light'} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={30} color={theme.text} />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>AI Interview Practice</Text>
              <View style={styles.statusRow}>
                <View style={[styles.dot, { backgroundColor: isConnected ? '#34C759' : '#FF3B30' }]} />
                <Text style={styles.statusLabel}>{isConnected ? 'Trực tuyến' : 'Mất kết nối'}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.infoBtn}>
              <Ionicons name="information-circle-outline" size={30} color={theme.text} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </BlurView>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      {(isTyping || isProcessingVoice) && (
        <View style={styles.typingIndicator}>
          <ActivityIndicator size="small" color={accentColor} />
          <Text style={styles.typingText}>
            {isProcessingVoice ? 'Đang xử lý giọng nói...' : 'AI đang phản hồi...'}
          </Text>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <View style={[styles.inputContainer, { backgroundColor: theme.background }]}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity 
              onLongPress={startRecording} 
              onPressOut={stopRecording}
              style={[styles.micBtn, recording && styles.micBtnActive]}
            >
              <Ionicons name={recording ? "mic" : "mic-outline"} size={22} color={recording ? "#fff" : accentColor} />
            </TouchableOpacity>
          </Animated.View>

          <TextInput
            placeholder="Nhập hoặc giữ mic để trả lời"
            placeholderTextColor="#8E8E93"
            style={[styles.input, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7', color: theme.text }]}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />

          <TouchableOpacity 
            onPress={sendMessage} 
            disabled={!inputText.trim()}
            style={[styles.sendBtn, { opacity: inputText.trim() ? 1 : 0.5 }]}
          >
            <Ionicons name="arrow-up" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default InterviewScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 },
  headerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 60 },
  headerInfo: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  statusLabel: { fontSize: 11, color: '#8E8E93' },
  backBtn: { width: 40 },
  infoBtn: { width: 40, alignItems: 'flex-end' },
  
  listContent: { paddingHorizontal: 16, paddingTop: 130, paddingBottom: 20 },
  msgWrapper: { marginBottom: 16, flexDirection: 'row', alignItems: 'flex-end' },
  userWrapper: { justifyContent: 'flex-end' },
  aiWrapper: { justifyContent: 'flex-start' },
  aiAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#8e44ad', justifyContent: 'center', alignItems: 'center', marginRight: 8, marginBottom: 4 },
  
  bubble: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, maxWidth: '85%' },
  userBubble: { backgroundColor: '#8e44ad', borderBottomRightRadius: 4 },
  aiBubble: { borderBottomLeftRadius: 4 },
  msgText: { fontSize: 15, lineHeight: 20 },
  timeText: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },

  typingIndicator: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
  typingText: { fontSize: 13, color: '#8E8E93', marginLeft: 8 },

  inputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#464545ff' },
  input: { flex: 1, minHeight: 40, maxHeight: 100, borderRadius: 15, paddingHorizontal: 15, paddingVertical: 10, marginHorizontal: 10, fontSize: 15 },
  micBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderColor: '#8e44ad', borderWidth: 1 },
  micBtnActive: { backgroundColor: '#FF3B30', borderColor: '#FF3B30' },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#8e44ad', justifyContent: 'center', alignItems: 'center' }
});