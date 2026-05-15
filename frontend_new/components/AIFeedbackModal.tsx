import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/themes";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { X, Sparkles, CheckCircle2, XCircle, AlertCircle } from "lucide-react-native";
import * as Haptics from "expo-haptics";

interface AIFeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  feedbackData: any;
  matchScore: number;
}

export const AIFeedbackModal = ({
  visible,
  onClose,
  feedbackData,
  matchScore,
}: AIFeedbackModalProps) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";

  if (!feedbackData) return null;

  const { ai_recommendation, strengths, weaknesses, skill_match, feedback } = feedbackData;

  const getRecommendationStyle = () => {
    if (ai_recommendation === 'STRONG_MATCH') return { color: "#2ecc71", text: "NÊN CHỌN", icon: <CheckCircle2 size={24} color="#2ecc71" /> };
    if (ai_recommendation === 'WEAK_MATCH') return { color: "#e74c3c", text: "KHÔNG NÊN CHỌN", icon: <XCircle size={24} color="#e74c3c" /> };
    return { color: "#f39c12", text: "CẦN XEM XÉT", icon: <AlertCircle size={24} color="#f39c12" /> };
  };

  const recStyle = getRecommendationStyle();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View
          style={[
            styles.header,
            {
              borderBottomColor: isDark ? "#2C2C2E" : "#E5E5EA",
              backgroundColor: isDark ? "#1C1C1E" : "#FFF",
            },
          ]}
        >
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
          >
            <X size={24} color={theme.text} />
          </TouchableOpacity>

          <View style={styles.titleWrap}>
            <Sparkles size={18} color="#8e44ad" style={{ marginRight: 6 }} />
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              Chi tiết đánh giá AI
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Overview Score */}
          <View style={[styles.card, { backgroundColor: isDark ? "#1C1C1E" : "#F8F8F8" }]}>
            <View style={styles.scoreRow}>
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreText}>{matchScore}%</Text>
              </View>
              <View style={styles.recContainer}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Đề xuất từ hệ thống</Text>
                <View style={styles.recRow}>
                  {recStyle.icon}
                  <Text style={[styles.recText, { color: recStyle.color }]}>{recStyle.text}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Strengths */}
          {strengths && strengths.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 8 }]}>
                👍 Ứng viên có
              </Text>
              {strengths.map((str: string, idx: number) => (
                <View key={`str-${idx}`} style={styles.bulletRow}>
                  <View style={[styles.bulletDot, { backgroundColor: "#2ecc71" }]} />
                  <Text style={[styles.bulletText, { color: theme.text }]}>{str}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Weaknesses */}
          {weaknesses && weaknesses.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 8 }]}>
                ⚠️ Cần xem xét (Điểm yếu)
              </Text>
              {weaknesses.map((wk: string, idx: number) => (
                <View key={`wk-${idx}`} style={styles.bulletRow}>
                  <View style={[styles.bulletDot, { backgroundColor: "#e74c3c" }]} />
                  <Text style={[styles.bulletText, { color: theme.text }]}>{wk}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Skills Comparison */}
          {(skill_match?.matched?.length > 0 || skill_match?.missing?.length > 0) && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 12 }]}>
                🔍 Đối chiếu kỹ năng
              </Text>
              
              {skill_match?.matched && skill_match.matched.length > 0 && (
                <View style={styles.skillGroup}>
                  <Text style={[styles.skillLabel, { color: "#2ecc71" }]}>Kỹ năng phù hợp:</Text>
                  <View style={styles.tagsContainer}>
                    {skill_match.matched.map((skill: string, i: number) => (
                      <View key={i} style={[styles.tag, { backgroundColor: isDark ? "#1a2c20" : "#e8f8f5", borderColor: "#2ecc71" }]}>
                        <Text style={[styles.tagText, { color: "#2ecc71" }]}>{skill}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {skill_match?.missing && skill_match.missing.length > 0 && (
                <View style={[styles.skillGroup, { marginTop: 12 }]}>
                  <Text style={[styles.skillLabel, { color: "#e74c3c" }]}>Kỹ năng còn thiếu:</Text>
                  <View style={styles.tagsContainer}>
                    {skill_match.missing.map((skill: string, i: number) => (
                      <View key={i} style={[styles.tag, { backgroundColor: isDark ? "#2c1c1c" : "#fdedec", borderColor: "#e74c3c" }]}>
                        <Text style={[styles.tagText, { color: "#e74c3c" }]}>{skill}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Overall Feedback */}
          {feedback && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 8 }]}>
                📝 Tổng quan
              </Text>
              <View style={[styles.feedbackBox, { backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7" }]}>
                <Text style={[styles.feedbackText, { color: theme.text }]}>{feedback}</Text>
              </View>
            </View>
          )}
          
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
  },
  headerBtn: {
    padding: 8,
  },
  titleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  content: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  scoreCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#8e44ad",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  scoreText: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "bold",
  },
  recContainer: {
    flex: 1,
  },
  recRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  recText: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    marginRight: 10,
  },
  bulletText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  skillGroup: {
    marginTop: 4,
  },
  skillLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 13,
    fontWeight: "500",
  },
  feedbackBox: {
    padding: 16,
    borderRadius: 12,
  },
  feedbackText: {
    fontSize: 15,
    lineHeight: 24,
    fontStyle: "italic",
  },
});
