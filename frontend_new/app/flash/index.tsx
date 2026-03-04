import { View, Image } from 'react-native'
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming
} from 'react-native-reanimated'
import { useEffect } from 'react'

export default function FlashScreen() {
    const scale = useSharedValue(0.9)
    const opacity = useSharedValue(0)

    useEffect(() => {
        scale.value = withTiming(1, { duration: 500 })
        opacity.value = withTiming(1, { duration: 500 })
    }, [])

    const style = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value
    }))

    return (
        <View style={{
            flex: 1,
            backgroundColor: '#000',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <Animated.View style={style}>
                <Image
                    // source={require('@/assets/images/logo.png')}
                    style={{ width: 120, height: 120 }}
                    resizeMode="contain"
                />
            </Animated.View>
        </View>
    )
}
