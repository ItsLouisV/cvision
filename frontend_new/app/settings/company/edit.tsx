import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, ScrollView,
  ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, Image, Pressable,
  TouchableOpacity
} from 'react-native';

import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/themes';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function EditCompanyScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];
  const { user } = useCurrentUser();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [links, setLinks] = useState<string[]>(['']);
  const [contactEmail, setContactEmail] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (user) fetchCompanyData();
  }, [user]);

  const fetchCompanyData = async () => {
    try {
      if (!user) return;
      const { data } = await supabase
          .from('employers')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (data) {
          setCompanyName(data.company_name || '');
          setDescription(data.company_description || '');
          setLogoUrl(data.company_logo || '');
          if (data.links) {
            setLinks(Array.isArray(data.links) ? data.links : [data.links]);
          }
          setContactEmail(data.contact_email || '');
          setAddress(data.address || '');
        }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const addLinkField = () => {
    if (links.length < 5) {
      setLinks([...links, '']);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Alert.alert("Giới hạn", "Bạn chỉ có thể thêm tối đa 5 liên kết.");
    }
  };

  const updateLink = (text: string, index: number) => {
    const newLinks = [...links];
    newLinks[index] = text;
    setLinks(newLinks);
  };

  const removeLink = (index: number) => {
    const newLinks = links.filter((_, i) => i !== index);
    setLinks(newLinks.length ? newLinks : ['']);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const requestMediaPermission = async () => {
    const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return newStatus === 'granted';
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestMediaPermission();
    if (!hasPermission) {
      Alert.alert('Lỗi', 'Cần quyền truy cập thư viện ảnh để chọn ảnh.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      uploadLogo(result.assets[0].uri);
    }
  };

  const uploadLogo = async (uri: string) => {
    setUploading(true);
    try {
      if (!user) return;

      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      const filePath = `${user.id}/${Date.now()}.png`;

      const { error } = await supabase.storage
        .from('avatars')
        .upload(`company-logos/${filePath}`, arrayBuffer, { contentType: 'image/png', upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(`company-logos/${filePath}`);
      setLogoUrl(publicUrl);
    } catch (error) {
      console.error(error);
      Alert.alert('Lỗi', 'Không thể tải ảnh lên.');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async () => {
    if (!companyName.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Thiếu thông tin", "Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    setSaving(true);
    try {
      if (!user) return;

      const cleanLinks = links.filter(link => link.trim() !== '');

      const { error } = await supabase
        .from('employers')
        .update({
          company_name: companyName,
          company_description: description,
          company_logo: logoUrl,
          links: cleanLinks,
          contact_email: contactEmail,
          address: address,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      Alert.alert("Lỗi", "Không thể cập nhật lúc này.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#8e44ad" />
      </View>
    );
  }

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#FFF' }}>
            {/* HEADER */}
            <SafeAreaView edges={['top']}
                style={[
                    styles.headerWrapper,
                    {
                    backgroundColor: isDark ? '#000' : '#FFF',
                    borderBottomColor: isDark
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(0,0,0,0.05)',
                    },
                ]}
            >
                <View style={styles.header}>
                    
                    {/* LEFT */}
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.headerSide}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="close" size={24} color={theme.text} />
                    </TouchableOpacity>

                    {/* CENTER */}
                    <View style={styles.headerCenter}>
                        <Text style={[styles.headerTitle, { color: theme.text }]}>
                        Chỉnh sửa hồ sơ
                    </Text>
                    </View>

                    {/* RIGHT */}
                    <TouchableOpacity
                        onPress={handleUpdate}
                        disabled={saving}
                        activeOpacity={0.8}
                        style={[
                            styles.saveButton,
                            {
                                opacity: saving ? 0.6 : 1,
                            },
                        ]}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.saveButtonText}>Lưu</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>


            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >

                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                {/* LOGO SECTION */}
                <View style={styles.logoSection}>
                    <TouchableOpacity
                        onPress={pickImage}
                        disabled={uploading}
                        activeOpacity={0.85}
                        style={[styles.logoWrapper, { backgroundColor: isDark ? '#2C2C2E' : '#FFF' }]}
                    >
                        {logoUrl ? (
                            <Image source={{ uri: logoUrl }} style={[styles.logo, { opacity: uploading ? 0.5 : 1 }]} />
                        ) : (
                            <MaterialCommunityIcons name="office-building" size={50} color={uploading ? '#C7C7CC' : '#8e44ad'} />
                        )}
                        {uploading ? (
                            <View style={styles.loaderOverlay}>
                                <ActivityIndicator color="#FFF" />
                            </View>
                        ) : (
                            <View style={styles.cameraBtn}>
                                <Ionicons name="camera" size={18} color="#FFF" />
                            </View>
                        )}
                    </TouchableOpacity>
                    <Text style={[styles.logoTitle, { color: theme.text }]}>{companyName || 'Tên công ty'}</Text>
                    <Text style={styles.logoHint}>Chạm để đổi logo công ty</Text>
                </View>

                {/* FORM CONTAINER */}
                <View style={styles.formContainer}>
                    <Text style={styles.sectionTitle}>THÔNG TIN CƠ BẢN</Text>
                    <View style={[styles.card, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}>
                        {renderInput("Tên công ty", companyName, setCompanyName, "name", "business-outline")}
                        <View style={styles.divider} />
                        {renderTextArea()}
                    </View>

                    <Text style={[styles.sectionTitle, { marginTop: 25 }]}>THÔNG TIN LIÊN HỆ</Text>
                    <View style={[styles.card, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}>
                        {renderInput("Email liên hệ", contactEmail, setContactEmail, "contact-email", "mail-outline")}
                        <View style={styles.divider} />
                        {renderInput("Trụ sở chính", address, setAddress, "address", "location-outline")}
                    </View>

                    <Text style={[styles.sectionTitle, { marginTop: 25 }]}>LIÊN KẾT MẠNG XÃ HỘI</Text>
                    <View style={[styles.card, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}>
                        {links.map((link, index) => (
                            <View key={index}>
                                <View style={styles.linkInputRow}>
                                    <View style={{ flex: 1 }}>
                                        {renderInput(`Liên kết ${index + 1}`, link, (t: string) => updateLink(t, index), `link-${index}`, "link-outline")}
                                    </View>
                                    {links.length > 1 && (
                                        <Pressable onPress={() => removeLink(index)} style={styles.removeBtn}>
                                            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                                        </Pressable>
                                    )}
                                </View>
                                {index < links.length - 1 && <View style={styles.divider} />}
                            </View>
                        ))}
                    
                        <Pressable onPress={addLinkField} style={styles.addLinkBtn}>
                            <Ionicons name="add-circle-outline" size={20} color="#8e44ad" />
                            <Text style={styles.addLinkText}>Thêm liên kết mới</Text>
                        </Pressable>
                    </View>
                </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );

    function renderInput(label: string, value: string, setter: any, id: string, icon: any) {
        const isFocused = focusedInput === id;
        return (
        <View style={styles.inputBlock}>
            <View style={styles.labelRow}>
            <Ionicons name={icon} size={14} color={isFocused ? '#8e44ad' : '#8E8E93'} />
            <Text style={[styles.label, { color: isFocused ? '#8e44ad' : '#8E8E93' }]}>
                {label.toUpperCase()}
            </Text>
            </View>

            <TextInput
            value={value}
            onChangeText={setter}
            onFocus={() => setFocusedInput(id)}
            onBlur={() => setFocusedInput(null)}
            placeholder="Nhập thông tin..."
            placeholderTextColor="#C7C7CC"
            style={[styles.input, { color: theme.text }]}
            />
        </View>
        );
    }

  function renderTextArea() {
    const isFocused = focusedInput === 'desc';
    return (
      <View style={styles.inputBlock}>
        <View style={styles.labelRow}>
          <Ionicons name="document-text-outline" size={14} color={isFocused ? '#8e44ad' : '#8E8E93'} />
          <Text style={[styles.label, { color: isFocused ? '#8e44ad' : '#8E8E93' }]}>
            GIỚI THIỆU
          </Text>
        </View>

        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          onFocus={() => setFocusedInput('desc')}
          onBlur={() => setFocusedInput(null)}
          placeholder="Mô tả ngắn gọn về doanh nghiệp..."
          placeholderTextColor="#C7C7CC"
          style={[styles.textArea, { color: theme.text }]}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    headerWrapper: {
        borderBottomWidth: 1,
    },

    header: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },

    headerSide: {
        width: 60,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },

    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },

    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
    },

    saveButton: {
        minWidth: 60,
        paddingHorizontal: 16,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#8e44ad',
        justifyContent: 'center',
        alignItems: 'center',
    },

    saveButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    
    headerContainer: {
        paddingTop: Platform.OS === 'android' ? 40 : 0
    },
    
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        paddingTop: Platform.OS === 'android' ? 10 : 0,
    },
    
    headerBtn: { padding: 4 },
    
    saveBtn: {
        backgroundColor: '#8e44ad',
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderRadius: 10,
    },
    
    saveText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
    
    scrollContainer: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60 },
    
    logoSection: { alignItems: 'center', marginBottom: 30 },
    
    logoWrapper: {
        width: 110,
        height: 110,
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 4,
        position: 'relative',
    },
    
    logo: { width: 110, height: 110, borderRadius: 75, overflow: 'hidden' },
    loaderOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 70, justifyContent: 'center', alignItems: 'center' },
    logoHint: { marginTop: 8, fontSize: 13, color: '#8E8E93' },
    
    cameraBtn: {
        position: 'absolute',
        bottom: 3,
        right: 3,
        backgroundColor: '#8e44ad',
        padding: 5,
        borderRadius: 35,
        borderWidth: 1,
        borderColor: '#F2F2F7',
    },
    
    logoTitle: { fontSize: 20, fontWeight: '800', marginTop: 15 },
    
    formContainer: { width: '100%' },
    
    sectionTitle: { fontSize: 13, fontWeight: '700', color: '#8E8E93', marginBottom: 10, marginLeft: 5, letterSpacing: 1 },
    
    card: { borderRadius: 20, padding: 15, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 1 },
    
    inputBlock: { paddingVertical: 5 },
    
    labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 5 },
    
    label: { fontSize: 11, fontWeight: '800' },
    
    input: { fontSize: 16, paddingVertical: 8 },
    
    textArea: { fontSize: 16, minHeight: 100, paddingTop: 10 },
    
    divider: { height: 1, backgroundColor: 'rgba(142, 142, 147, 0.1)', marginVertical: 10 },
    
    linkInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    
    removeBtn: { padding: 10 },
    
    addLinkBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 15,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: 'rgba(142, 68, 173, 0.2)',
        borderStyle: 'dashed',
        borderRadius: 12,
    },
    
    addLinkText: { color: '#8e44ad', fontWeight: '600', fontSize: 14 }
});