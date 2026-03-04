import { View, StyleSheet, Dimensions } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
  interpolate,
  Extrapolate,
  runOnJS,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { BlurView } from 'expo-blur'

// Import theme hooks
import { Colors } from '@/constants/themes'
import { useColorScheme } from '@/hooks/use-color-scheme'

import FeedView from './components/FeedView'
import SavedView from './components/SavedView'
import SearchView from './components/SearchView'

const { width } = Dimensions.get('window')

const SAVED_WIDTH = width * 0.8
const SWIPE_THRESHOLD = width * 0.35

type Mode = 'feed' | 'saved' | 'search'

export default function HomeScreen() {
    // Lấy theme hiện tại
    const colorScheme = useColorScheme()
    const theme = Colors[colorScheme ?? 'light']

    const mode = useSharedValue<Mode>('feed')
    const feedX = useSharedValue(0)
    const searchX = useSharedValue(width)
    const hapticOnce = useSharedValue(false)

    /** ===== ACTIONS ===== */
    const openSaved = () => {
        'worklet'
        feedX.value = withTiming(SAVED_WIDTH, { duration: 300 })
        mode.value = 'saved'
    }

    const openSearch = () => {
        'worklet'
        searchX.value = withTiming(0, { duration: 300 })
        mode.value = 'search'
    }

    const closeSearch = () => {
        'worklet'
        searchX.value = withTiming(width, { duration: 300 })
        mode.value = 'feed'
    }

    const triggerHaptic = () =>
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    /** ===== PROGRESS ===== */
    const feedProgress = useDerivedValue(() =>
        interpolate(feedX.value, [0, SAVED_WIDTH], [0, 1], Extrapolate.CLAMP)
    )

    const searchProgress = useDerivedValue(() =>
        interpolate(searchX.value, [width, 0], [0, 1], Extrapolate.CLAMP)
    )

  /** ===== GESTURE ===== */
    const panGesture = Gesture.Pan()
    .onUpdate((e) => {
        if (Math.abs(e.translationX) < Math.abs(e.translationY)) return

        if (mode.value === 'feed') {
            if (e.translationX > 0) {
                feedX.value = Math.min(SAVED_WIDTH, e.translationX)
            } else {
                searchX.value = Math.max(0, width + e.translationX)
            }

            if (Math.abs(e.translationX) > SWIPE_THRESHOLD && !hapticOnce.value) {
                hapticOnce.value = true
                runOnJS(triggerHaptic)()
            }

            if (Math.abs(e.translationX) < SWIPE_THRESHOLD) {
                hapticOnce.value = false
            }
        }

        if (mode.value === 'saved') {
            feedX.value = Math.max(0, SAVED_WIDTH + e.translationX)
        }

        if (mode.value === 'search') {
            searchX.value = Math.max(0, e.translationX)
        }
    })
    .onEnd((e) => {
        if (mode.value === 'feed' && e.translationX > SWIPE_THRESHOLD) {
            feedX.value = withTiming(SAVED_WIDTH, { duration: 260 })
            mode.value = 'saved'
        } else if (mode.value === 'feed' && e.translationX < -SWIPE_THRESHOLD) {
            searchX.value = withTiming(0, { duration: 260 })
            mode.value = 'search'
        } else if (mode.value === 'saved' && e.translationX < -SWIPE_THRESHOLD) {
            feedX.value = withTiming(0, { duration: 260 })
            mode.value = 'feed'
        } else if (mode.value === 'search' && e.translationX > SWIPE_THRESHOLD) {
            searchX.value = withTiming(width, { duration: 260 })
            mode.value = 'feed'
        } else {
            feedX.value = withTiming(mode.value === 'saved' ? SAVED_WIDTH : 0, { duration: 220 })
            searchX.value = withTiming(mode.value === 'search' ? 0 : width, { duration: 220 })
        }
        hapticOnce.value = false
    })

    /** ===== ANIMATED STYLES ===== */
    const savedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(feedProgress.value, [0, 1], [0.96, 1], Extrapolate.CLAMP) }],
    }))

    const feedStyle = useAnimatedStyle(() => {
        const pushProgress = interpolate(searchX.value, [width, 0], [0, 1], Extrapolate.CLAMP)
        const translateX = interpolate(pushProgress, [0, 1], [0, -width * 0.35], Extrapolate.CLAMP)
        const scaleX = interpolate(pushProgress, [0, 1], [1, 0.88], Extrapolate.CLAMP)
        const anchorFix = (1 - scaleX) * width * 0.5

        return {
            transform: [
                { translateX: feedX.value + translateX + anchorFix },
                { scaleX },
                { scaleY: 1 },
            ],
        shadowOpacity: interpolate(pushProgress, [0, 1], [0, 0.18]),
        shadowRadius: interpolate(pushProgress, [0, 1], [0, 16]),
        }
    })

    const feedDimStyle = useAnimatedStyle(() => ({
        opacity: interpolate(Math.max(feedProgress.value, searchProgress.value), [0, 1], [0, 0.4], Extrapolate.CLAMP),
    }))

    const searchStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: searchX.value }],
    }))

    const searchEdgeStyle = useAnimatedStyle(() => ({
        opacity: interpolate(searchProgress.value, [0, 1], [0, 0.3], Extrapolate.CLAMP),
    }))

    return (
        <GestureDetector gesture={panGesture}>
        {/* Container nền đổi màu theo theme để tránh lộ khoảng trắng khi kéo */}
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                
                {/* ===== SAVED ===== */}
                <Animated.View style={[styles.saved, savedStyle, { backgroundColor: theme.background }]}>
                    <SavedView />
                </Animated.View>

                {/* ===== FEED ===== */}
                <Animated.View style={[styles.feed, feedStyle, { backgroundColor: theme.background }]}>
                    <FeedView
                        onPressMenu={() => runOnJS(openSaved)()}
                        onPressSearch={() => runOnJS(openSearch)()}
                    />

                    {/* Dim Overlay - Màu đen cho Light, hoặc xám đậm cho Dark */}
                    <Animated.View
                        pointerEvents="none"
                        style={[
                            styles.feedDim, 
                            feedDimStyle, 
                            { backgroundColor: colorScheme === 'dark' ? '#000' : '#444' }
                        ]}
                    />

                    {/* Blur Overlay */}
                    <Animated.View
                        pointerEvents="none"
                        style={[StyleSheet.absoluteFill, feedDimStyle]}
                    >
                        <BlurView 
                            intensity={20} 
                            tint={colorScheme === 'dark' ? 'dark' : 'light'} 
                            style={StyleSheet.absoluteFill} 
                        />
                    </Animated.View>
                </Animated.View>

                {/* ===== SEARCH ===== */}
                <Animated.View style={[styles.search, searchStyle, { backgroundColor: theme.background }]}>
                    <SearchView onBack={() => runOnJS(closeSearch)()} />

                    {/* Viền tối bên trái Search - Thích ứng màu */}
                    <Animated.View
                        pointerEvents="none"
                        style={[
                            styles.searchEdge, 
                            searchEdgeStyle, 
                            { backgroundColor: '#000' }
                        ]}
                    />
                </Animated.View>
            </View>
        </GestureDetector>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        overflow: 'hidden',
    },
    saved: {
        position: 'absolute',
        width: SAVED_WIDTH,
        left: 0,
        top: 0,
        bottom: 0,
    },
    feed: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 5,
        shadowColor: '#000',
        shadowOffset: { width: -12, height: 0 },
        elevation: 12,
    },
    search: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 7,
    },
    feedDim: {
        ...StyleSheet.absoluteFillObject,
    },
    searchEdge: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 0, // Tăng độ rộng để bóng mờ đẹp hơn
        shadowColor: '#000',
        shadowOffset: { width: -10, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
})