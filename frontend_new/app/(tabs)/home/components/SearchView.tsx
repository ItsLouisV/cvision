import React from 'react';
import { StyleSheet, Text, View, TextInput, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

// Sử dụng theme hệ thống
import { Colors } from '@/constants/themes';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { router } from 'expo-router';

const SUGGESTIONS = ['LGBTQ Threads', 'Makeup Threads', 'Book Threads', 'Tarot Threads', 'Hồ Gươm'];

const USERS = [
    { id: '1', name: 'tr.giahuy1504', subName: 'Trương Gia Huy', followers: '188 người theo dõi', avatar: 'https://i.pravatar.cc/150?u=1' },
    { id: '2', name: 'zaynn_jela', subName: 'zaynnn', followers: '2,2K người theo dõi', avatar: 'https://i.pravatar.cc/150?u=2' },
    { id: '3', name: '_ponpon2811', subName: 'Tiêu Chiến', followers: '4,8K người theo dõi', avatar: 'https://i.pravatar.cc/150?u=3' },
    { id: '4', name: 'hai_truongv', subName: 'Võ Trường Hải', followers: '397 người theo dõi', avatar: 'https://i.pravatar.cc/150?u=4' },
    { id: '5', name: 'nguyenminhduc_', subName: 'Nguyễn Minh Đức', followers: '1,1K người theo dõi', avatar: 'https://i.pravatar.cc/150?u=5' },
    { id: '6', name: 'lethihanggg', subName: 'Lê Thị Hằng', followers: '3,4K người theo dõi', avatar: 'https://i.pravatar.cc/150?u=6' },
    { id: '7', name: 'phamvanthanh_', subName: 'Phạm Văn Thành', followers: '256 người theo dõi', avatar: 'https://i.pravatar.cc/150?u=7' },
    { id: '8', name: 'tranthimy_', subName: 'Trần Thị Mỹ', followers: '5K người theo dõi', avatar: 'https://i.pravatar.cc/150?u=8' },
    { id: '9', name: 'vuongquockhanh', subName: 'Vương Quốc Khánh', followers: '789 người theo dõi', avatar: 'https://i.pravatar.cc/150?u=9' },
    { id: '10', name: 'phamthithuytien', subName: 'Phạm Thị Thùy Tiên', followers: '6,5K người theo dõi', avatar: 'https://i.pravatar.cc/150?u=10' },
];

interface SearchViewProps {
    onBack?: () => void; 
}

const SearchView = ({ onBack }: SearchViewProps) => {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

    // Màu sắc động dựa trên theme
    const dynamicStyles = {
        container: { backgroundColor: theme.background },
        text: { color: theme.text },
        searchBar: { backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#f1f1f1' },
        subText: { color: colorScheme === 'dark' ? '#888' : '#666' },
        border: { borderColor: colorScheme === 'dark' ? '#333' : '#f0f0f0' },
        tag: { 
            backgroundColor: theme.background, 
            borderColor: colorScheme === 'dark' ? '#444' : '#eee' 
        }
    };

    return (
        <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
            {/* Header với nút Back */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, dynamicStyles.text]}>Tìm kiếm</Text>
            </View>

            {/* Search Bar */}
            <View style={[styles.searchSection, dynamicStyles.searchBar]}>
                <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                <TextInput
                    style={[styles.input, dynamicStyles.text]}
                    placeholder="Tìm kiếm"
                    placeholderTextColor="#999"
                />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {/* Horizontal Suggestions */}
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    style={styles.suggestionScroll}
                    contentContainerStyle={{ paddingRight: 20 }}
                >
                    {SUGGESTIONS.map((item, index) => (
                        <View key={index} style={[styles.suggestionTag, dynamicStyles.tag]}>
                        <Text style={[styles.suggestionText, dynamicStyles.text]}>{item}</Text>
                        </View>
                    ))}
                </ScrollView>

                <Text style={[styles.sectionTitle, dynamicStyles.subText]}>Gợi ý theo dõi</Text>

                {/* Users List */}
                {USERS.map((user) => (
                    <View key={user.id} style={styles.userItem}>
                        <Image source={{ uri: user.avatar }} style={styles.avatar} />
                        <View style={[styles.userInfo, dynamicStyles.border]}>
                            <View style={styles.userTextContent}>
                                <Text style={[styles.userName, dynamicStyles.text]}>{user.name}</Text>
                                <Text style={[styles.subName, dynamicStyles.subText]}>{user.subName}</Text>
                                <Text style={[styles.followerCount, dynamicStyles.text]}>{user.followers}</Text>
                            </View>
                            <TouchableOpacity style={[styles.followButton, dynamicStyles.border]}>
                                <Text style={[styles.followButtonText, dynamicStyles.text]}>Theo dõi</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
};

export default SearchView;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 50,
        marginBottom: 10,
    },
    backButton: {
        marginRight: 10,
        marginLeft: -10,
        padding: 5,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    searchSection: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 45,
        marginHorizontal: 16,
        marginBottom: 15,
    },
    searchIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 16,
    },
    suggestionScroll: {
        paddingLeft: 16,
        marginBottom: 20,
    },
    suggestionTag: {
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 8,
        marginRight: 8,
    },
    suggestionText: {
        fontWeight: '600',
        fontSize: 14,
    },
    sectionTitle: {
        fontSize: 16,
        paddingHorizontal: 16,
        marginBottom: 15,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#eee',
    },
    userInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 15,
        borderBottomWidth: 0.5,
        paddingBottom: 15,
    },
    userTextContent: {
        flex: 1,
    },
    userName: {
        fontSize: 15,
        fontWeight: '700',
    },
    subName: {
        fontSize: 14,
    },
    followerCount: {
        fontSize: 14,
        marginTop: 4,
    },
    followButton: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 6,
    },
    followButtonText: {
        fontWeight: '700',
        fontSize: 14,
    },
});