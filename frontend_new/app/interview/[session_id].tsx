import { ENV } from "@/config";
import { Colors } from "@/constants/themes";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { BlurView } from "expo-blur";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface Message {
  id: string;
  sender: "ai" | "user";
  content: string;
  timestamp: Date;
}

const BouncingDots = ({ color }: { color: string }) => {
  const [animation1] = useState(new Animated.Value(0));
  const [animation2] = useState(new Animated.Value(0));
  const [animation3] = useState(new Animated.Value(0));

  useEffect(() => {
    const createAnimation = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    createAnimation(animation1, 0).start();
    createAnimation(animation2, 200).start();
    createAnimation(animation3, 400).start();
  }, []);

  const dotStyle = (anim: Animated.Value) => ({
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: color,
    marginHorizontal: 3,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -5],
        }),
      },
    ],
  });

  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 4, height: 16 }}>
      <Animated.View style={dotStyle(animation1)} />
      <Animated.View style={dotStyle(animation2)} />
      <Animated.View style={dotStyle(animation3)} />
    </View>
  );
};

const InterviewScreen = () => {
  const { session_id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";
  const accentColor = "#8e44ad";

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingMessage, setTypingMessage] = useState("AI đang suy nghĩ...");
  const [isVoiceMode, setIsVoiceMode] = useState(false);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const [evaluation, setEvaluation] = useState<any>(null);
  const { user } = useCurrentUser();

  const ws = useRef<WebSocket | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const ripple1 = useRef(new Animated.Value(0)).current;
  const ripple2 = useRef(new Animated.Value(0)).current;
  const ripple3 = useRef(new Animated.Value(0)).current;
  const micGlow = useRef(new Animated.Value(1)).current;
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimer = useRef<any>(null);

  const appState = useRef(AppState.currentState);

  const connectWebSocket = () => {
    if (
      ws.current &&
      (ws.current.readyState === WebSocket.OPEN ||
        ws.current.readyState === WebSocket.CONNECTING)
    ) {
      return; // Đã kết nối hoặc đang kết nối
    }

    const baseUrl = ENV.API_URL.replace("http://", "ws://").replace(
      "https://",
      "wss://",
    );
    const wsUrl = `${baseUrl}/interview/ws/${session_id}`;

    ws.current = new WebSocket(wsUrl);

    let pingInterval: any;

    ws.current.onopen = () => {
      setIsConnected(true);
      pingInterval = setInterval(() => {
        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ type: "ping" }));
        }
      }, 10000);
    };

    ws.current.onclose = () => {
      setIsConnected(false);
      if (pingInterval) clearInterval(pingInterval);
    };

    ws.current.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "pong") return;

        // Bắt sự kiện đang gõ/đọc CV
        if (data.type === "typing") {
          setIsTyping(true);
          setTypingMessage(data.content);
          return;
        }

        // Tránh bị duplicate tin nhắn chào mừng khi reconnect
        if (data.type === "system") return;

        // Bắt payload Đánh Giá hiển thị trên UI
        if (data.type === "summary" && data.evaluation) {
          setEvaluation(data.evaluation);
          return;
        }

        if (data.type === "stream_start") {
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              id: data.id,
              sender: "ai",
              content: "",
              timestamp: new Date(),
            },
          ]);
          return;
        }

        if (data.type === "stream_chunk") {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === data.id
                ? { ...msg, content: msg.content + data.content }
                : msg
            )
          );
          return;
        }

        if (data.type === "stream_end") {
          setIsTyping(false);
          setTypingMessage("AI đang suy nghĩ...");
          return;
        }

        // Dành cho fallback trả lời dạng cục bộ (ví dụ question)
        if (data.content && !data.type?.startsWith("stream_")) {
          setMessages((prev) => [
            ...prev,
            {
              id: Math.random().toString(),
              sender: "ai",
              content: data.content,
              timestamp: new Date(),
            },
          ]);
          setIsTyping(false);
          setTypingMessage("AI đang suy nghĩ...");
        }
      } catch (err) {
        console.error("Lỗi parse dữ liệu WS:", err);
      }
    };

    ws.current.onerror = (e) => {
      console.error("WebSocket Error:", e);
    };

    return pingInterval;
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("interview_messages")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const formattedMessages = data.map((msg: any) => ({
          id: msg.id,
          sender: (msg.sender === "user" ? "user" : "ai") as "user" | "ai",
          content: msg.content,
          timestamp: new Date(msg.created_at),
        }));
        setMessages(formattedMessages);
      }
      // Sau đó fetch session record để lấy feedback Đánh giá cũ (nếu có)
      const { data: sessionData } = await supabase
        .from("interview_sessions")
        .select("status, overall_feedback")
        .eq("id", session_id)
        .single();

      if (
        sessionData &&
        sessionData.status === "completed" &&
        sessionData.overall_feedback
      ) {
        try {
          // Parse string JSON đã lưu trong backend
          const parsedEval = JSON.parse(sessionData.overall_feedback);
          setEvaluation(parsedEval);
        } catch (e) {
          console.error("Lỗi parse evaluation từ lịch sử:", e);
        }
      }
    } catch (error) {
      console.error("Lỗi lấy lịch sử chat:", error);
    }
  };

  useEffect(() => {
    // Fetch tin nhắn cũ khi vào màn hình
    fetchMessages();
  }, []);

  useEffect(() => {
    fetchMessages().then(() => {
      let currentPingInterval = connectWebSocket();

      const subscription = AppState.addEventListener(
        "change",
        (nextAppState) => {
          if (
            appState.current.match(/inactive|background/) &&
            nextAppState === "active"
          ) {
            // App vừa được mở lại (Foreground)
            console.log("App has come to the foreground!");
            connectWebSocket();
          }
          appState.current = nextAppState;
        },
      );

      return () => {
        if (currentPingInterval) clearInterval(currentPingInterval);
        ws.current?.close();
        subscription.remove();
      };
    });
  }, [session_id]);

  // Hiệu ứng ripple khi đang ghi âm
  useEffect(() => {
    if (recording) {
      // Timer đếm giây
      setRecordingDuration(0);
      recordingTimer.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      // Ripple staggered animation
      const createRipple = (anim: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
              Animated.timing(anim, {
                toValue: 1,
                duration: 1800,
                useNativeDriver: true,
              }),
            ]),
            Animated.timing(anim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        );

      // Mic glow
      Animated.loop(
        Animated.sequence([
          Animated.timing(micGlow, {
            toValue: 1.12,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(micGlow, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ).start();

      createRipple(ripple1, 0).start();
      createRipple(ripple2, 600).start();
      createRipple(ripple3, 1200).start();
    } else {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
        recordingTimer.current = null;
      }
      ripple1.setValue(0);
      ripple2.setValue(0);
      ripple3.setValue(0);
      micGlow.setValue(1);
    }
    return () => {
      if (recordingTimer.current) clearInterval(recordingTimer.current);
    };
  }, [recording]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  async function startRecording() {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Lỗi", "Cần quyền truy cập micro để luyện tập phỏng vấn.");
        return;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      // Chuẩn bị file ghi âm trước khi bắt đầu (bắt buộc để tạo file trên disk)
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setRecording(true);
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  }

  async function stopRecording() {
    if (!recording) return;
    try {
      setRecording(false);
      await audioRecorder.stop();

      const uri = audioRecorder.uri;
      if (uri) {
        setIsVoiceMode(false);
        sendVoiceFile(uri);
      }
    } catch (err) {
      console.error("Stop recording error:", err);
    }
  }

  const sendVoiceFile = async (uri: string) => {
    setIsProcessingVoice(true);
    try {
      const formData = new FormData();
      // @ts-ignore
      formData.append("file", {
        uri: Platform.OS === "ios" ? (!uri.startsWith("file://") ? `file://${uri}` : uri) : uri,
        type: "audio/m4a",
        name: "speech.m4a",
      });

      const res = await axios.post(`${ENV.API_URL}/interview/stt/convert`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Tự động gửi tin nhắn qua WebSocket nếu nhận diện được text
      const transcribedText = res.data?.text?.trim();
      if (transcribedText && ws.current?.readyState === WebSocket.OPEN && user?.id) {
        // Hiển thị tin nhắn user ngay trên UI
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "user",
            content: transcribedText,
            timestamp: new Date(),
          },
        ]);

        // Gửi qua WebSocket
        ws.current.send(
          JSON.stringify({ type: "answer", content: transcribedText, user_id: user?.id })
        );
        setIsTyping(true);
      } else if (transcribedText) {
        // Fallback: nếu WS chưa sẵn sàng, đặt vào input để user gửi tay
        setInputText(transcribedText);
      }
    } catch (e) {
      Alert.alert(
        "Lỗi",
        "Không thể nhận diện giọng nói. Hãy kiểm tra kết nối server.",
      );
    } finally {
      setIsProcessingVoice(false);
    }
  };

  const sendMessage = () => {
    if (
      !inputText.trim() ||
      !ws.current ||
      ws.current.readyState !== WebSocket.OPEN ||
      !user?.id
    ) {
      if (!user?.id) {
        Alert.alert("Lỗi", "Không tìm thấy User ID.");
        return;
      }

      if (ws.current?.readyState !== WebSocket.OPEN) {
        Alert.alert("Lỗi", "Đang mất kết nối với Server.");
      }
      return;
    }

    const userMsg = inputText.trim();
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: "user",
        content: userMsg,
        timestamp: new Date(),
      },
    ]);

    ws.current.send(
      JSON.stringify({ type: "answer", content: userMsg, user_id: user?.id }),
    );
    setInputText("");
    setIsTyping(true);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === "user";

    const copyToClipboard = async () => {
      await Clipboard.setStringAsync(item.content);
      Toast.show({
        type: "success",
        text1: "Copied to clipboard!",
        position: "top",
        topOffset: 50,
        visibilityTime: 1000,
        autoHide: true,
        onPress: () => Toast.hide(),
      });
    };

    return (
      <View
        style={[
          styles.msgWrapper,
          isUser ? styles.userWrapper : styles.aiWrapper,
        ]}
      >
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Ionicons name="sparkles" size={12} color="#fff" />
          </View>
        )}
        <TouchableOpacity
          activeOpacity={0.8}
          onLongPress={copyToClipboard}
          style={[
            styles.bubble,
            isUser
              ? styles.userBubble
              : [
                  styles.aiBubble,
                  { backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7" },
                ],
          ]}
        >
          <Text
            style={[styles.msgText, { color: isUser ? "#fff" : theme.text }]}
          >
            {item.content}
          </Text>
          <Text
            style={[
              styles.timeText,
              { color: isUser ? "rgba(255,255,255,0.7)" : "#8E8E93" },
            ]}
          >
            {item.timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEvaluation = () => {
    if (!evaluation) return null;
    return (
      <View
        style={[
          styles.evaluationCard,
          { backgroundColor: isDark ? "#2C2C2E" : "#FFFFFF" },
        ]}
      >
        <Text style={[styles.evalTitle, { color: theme.text }]}>
          📊 Kết quả Phỏng vấn
        </Text>

        <View style={styles.scoreRow}>
          <View style={styles.scoreBox}>
            <Text style={[styles.scoreNumber, { color: "#8e44ad" }]}>
              {evaluation.overall_score}
            </Text>
            <Text style={styles.scoreLabel}>Tổng điểm</Text>
          </View>
          <View style={styles.scoreBox}>
            <Text style={[styles.scoreNumber, { color: "#34C759" }]}>
              {evaluation.technical_score}
            </Text>
            <Text style={styles.scoreLabel}>Kỹ thuật</Text>
          </View>
          <View style={styles.scoreBox}>
            <Text style={[styles.scoreNumber, { color: "#007AFF" }]}>
              {evaluation.communication_score}
            </Text>
            <Text style={styles.scoreLabel}>Giao tiếp</Text>
          </View>
        </View>

        <Text style={[styles.evalSectionTitle, { color: theme.text }]}>
          💪 Điểm mạnh:
        </Text>
        {evaluation.strengths?.map((item: string, idx: number) => (
          <Text key={idx} style={[styles.evalText, { color: theme.text }]}>
            • {item}
          </Text>
        ))}

        <Text
          style={[
            styles.evalSectionTitle,
            { color: theme.text, marginTop: 12 },
          ]}
        >
          🎯 Cần cải thiện:
        </Text>
        {evaluation.weaknesses?.map((item: string, idx: number) => (
          <Text key={idx} style={[styles.evalText, { color: theme.text }]}>
            • {item}
          </Text>
        ))}

        <Text
          style={[
            styles.evalSectionTitle,
            { color: theme.text, marginTop: 12 },
          ]}
        >
          💡 Lời khuyên:
        </Text>
        <Text style={[styles.evalText, { color: theme.text }]}>
          {evaluation.advice}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <BlurView
        intensity={isDark ? 30 : 50}
        tint={isDark ? "dark" : "light"}
        style={styles.header}
      >
        <SafeAreaView edges={["top"]}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
            >
              <Ionicons name="chevron-back" size={28} color={theme.text} />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>
                AI Interview Practice
              </Text>
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: isConnected ? "#34C759" : "#FF3B30" },
                  ]}
                />
                <Text style={styles.statusLabel}>
                  {isConnected ? "Trực tuyến" : "Đang kết nối..."}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.infoBtn}>
              <Ionicons
                name="information-circle-outline"
                size={26}
                color={theme.text}
              />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </BlurView>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={renderEvaluation}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
      />

      {(isTyping || isProcessingVoice) && (
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <View style={[styles.msgWrapper, styles.aiWrapper, { marginBottom: 0 }]}>
            <View style={styles.aiAvatar}>
              <Ionicons name="sparkles" size={12} color="#fff" />
            </View>
            <View
              style={[
                styles.bubble,
                styles.aiBubble,
                {
                  backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7",
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 14,
                },
              ]}
            >
              <BouncingDots color={"#8E8E93"} />
              <Text style={[styles.typingText, { marginLeft: 8, color: "#8E8E93", fontSize: 12 }]}>
                {isProcessingVoice ? "Đang xử lý giọng nói..." : typingMessage}
              </Text>
            </View>
          </View>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {!isVoiceMode ? (
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: theme.background,
                paddingBottom: Platform.OS === "ios" ? 30 : 15,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => !evaluation && setIsVoiceMode(true)}
              disabled={!!evaluation}
              style={[styles.micBtn, !!evaluation && { opacity: 0.4 }]}
            >
              <Ionicons name="mic-outline" size={22} color={accentColor} />
            </TouchableOpacity>

            <TextInput
              placeholder={
                evaluation ? "Đã kết thúc phỏng vấn" : "Trả lời phỏng vấn..."
              }
              editable={!evaluation}
              selectTextOnFocus={!evaluation}
              placeholderTextColor="#8E8E93"
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? "#1C1C1E" : "#F2F2F7",
                  color: theme.text,
                },
              ]}
              value={inputText}
              onChangeText={setInputText}
              multiline
            />

            <TouchableOpacity
              onPress={sendMessage}
              disabled={!inputText.trim() || !!evaluation}
              style={[
                styles.sendBtn,
                { opacity: inputText.trim() && !evaluation ? 1 : 0.5 },
              ]}
            >
              <Ionicons name="arrow-up" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View
            style={[
              styles.voiceModeContainer,
              {
                backgroundColor: theme.background,
                paddingBottom: Platform.OS === "ios" ? 30 : 15,
              },
            ]}
          >
            <TouchableOpacity onPress={() => setIsVoiceMode(false)} style={styles.keyboardBtn}>
              <Ionicons name="keypad-outline" size={24} color={accentColor} />
            </TouchableOpacity>
            
            <View style={styles.voiceRecordArea}>
              <View style={styles.rippleContainer}>
                {/* Ripple rings */}
                {recording && [ripple1, ripple2, ripple3].map((anim, i) => (
                  <Animated.View
                    key={i}
                    style={[
                      styles.rippleRing,
                      {
                        opacity: anim.interpolate({
                          inputRange: [0, 0.3, 1],
                          outputRange: [0.6, 0.3, 0],
                        }),
                        transform: [
                          {
                            scale: anim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 2.8],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                ))}

                {/* Mic button */}
                <Animated.View style={recording ? { transform: [{ scale: micGlow }] } : undefined}>
                  <TouchableOpacity
                    onPress={recording ? stopRecording : startRecording}
                    activeOpacity={0.8}
                    style={[styles.bigMicBtn, recording && styles.bigMicBtnActive]}
                  >
                    <Ionicons
                      name={recording ? "stop" : "mic"}
                      size={36}
                      color={recording ? "#fff" : accentColor}
                    />
                  </TouchableOpacity>
                </Animated.View>
              </View>

              {recording && (
                <View style={styles.timerRow}>
                  <View style={styles.liveIndicator}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>REC</Text>
                  </View>
                  <Text style={styles.timerText}>{formatDuration(recordingDuration)}</Text>
                </View>
              )}

              <Text style={[styles.voiceInstructionText, { color: recording ? '#FF3B30' : theme.text }]}>
                {recording ? "Bấm để dừng ghi âm" : "Bấm vào mic để ghi âm"}
              </Text>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
};

export default InterviewScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 100 },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 60,
  },
  headerInfo: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 16, fontWeight: "700" },
  statusRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  statusLabel: { fontSize: 10, color: "#8E8E93" },
  backBtn: { width: 40 },
  infoBtn: { width: 40, alignItems: "flex-end" },

  listContent: { paddingHorizontal: 16, paddingTop: 120, paddingBottom: 20 },
  msgWrapper: {
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  userWrapper: { justifyContent: "flex-end" },
  aiWrapper: { justifyContent: "flex-start" },
  aiAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#8e44ad",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    marginBottom: 4,
  },

  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    maxWidth: "80%",
  },
  userBubble: { backgroundColor: "#8e44ad", borderBottomRightRadius: 4 },
  aiBubble: { borderBottomLeftRadius: 4 },
  msgText: { fontSize: 15, lineHeight: 22 },
  timeText: { fontSize: 9, marginTop: 4, alignSelf: "flex-end" },

  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  typingText: { fontSize: 12, color: "#8E8E93", marginLeft: 8 },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128,128,128,0.3)",
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginHorizontal: 8,
    fontSize: 15,
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderColor: "#8e44ad",
    borderWidth: 1.5,
  },
  micBtnActive: { backgroundColor: "#FF3B30", borderColor: "#FF3B30" },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#8e44ad",
    justifyContent: "center",
    alignItems: "center",
  },
  evaluationCard: {
    marginTop: 10,
    marginBottom: 30,
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  evalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  scoreBox: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "rgba(142,68,173,0.05)",
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 12,
  },
  scoreNumber: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 4,
  },
  scoreLabel: {
    fontSize: 12,
    color: "#8E8E93",
    fontWeight: "500",
  },
  evalSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
  evalText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 4,
    paddingLeft: 4,
  },
  voiceModeContainer: {
    paddingHorizontal: 12,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128,128,128,0.3)",
    alignItems: "center",
    height: 280,
  },
  keyboardBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(142,68,173,0.1)",
    zIndex: 10,
  },
  voiceRecordArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  rippleContainer: {
    width: 160,
    height: 160,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  rippleRing: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "#FF3B30",
  },
  bigMicBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    borderColor: "#8e44ad",
    borderWidth: 2.5,
    backgroundColor: "transparent",
  },
  bigMicBtnActive: {
    backgroundColor: "#FF3B30",
    borderColor: "#FF3B30",
    shadowColor: "#FF3B30",
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 59, 48, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF3B30",
  },
  liveText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FF3B30",
    letterSpacing: 1,
  },
  timerText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FF3B30",
    fontVariant: ["tabular-nums"],
    letterSpacing: 2,
  },
  voiceInstructionText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 22,
    opacity: 0.7,
  },
});
