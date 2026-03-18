import { useEffect, useState, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const BIOMETRIC_ENABLED_KEY = '@cvision_biometric_enabled';

export type BiometricType = 'facial' | 'fingerprint' | 'iris' | null;

export function useBiometricAuth() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Kiểm tra thiết bị có hỗ trợ sinh trắc học không + đọc trạng thái đã bật
  useEffect(() => {
    const init = async () => {
      try {
        // 1. Kiểm tra phần cứng
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        const available = compatible && enrolled;
        setIsAvailable(available);

        // 2. Xác định loại sinh trắc học
        if (available) {
          const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
          if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            setBiometricType('facial');
          } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            setBiometricType('fingerprint');
          } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
            setBiometricType('iris');
          }
        }

        // 3. Đọc trạng thái đã bật từ AsyncStorage
        const stored = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
        setIsEnabled(stored === 'true' && available);
      } catch (error) {
        console.error('❌ Lỗi khởi tạo biometric:', error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // Lấy tên hiển thị cho loại sinh trắc học
  const getBiometricLabel = useCallback((): string => {
    if (biometricType === 'facial') {
      return Platform.OS === 'ios' ? 'Face ID' : 'Nhận diện khuôn mặt';
    }
    if (biometricType === 'fingerprint') {
      return Platform.OS === 'ios' ? 'Touch ID' : 'Vân tay';
    }
    if (biometricType === 'iris') {
      return 'Quét mống mắt';
    }
    return 'Sinh trắc học';
  }, [biometricType]);

  // Lấy tên icon Ionicons tương ứng
  const getBiometricIcon = useCallback((): string => {
    if (biometricType === 'facial') return 'scan';
    if (biometricType === 'fingerprint') return 'finger-print';
    return 'scan';
  }, [biometricType]);

  // Gọi prompt xác thực sinh trắc học
  const authenticate = useCallback(async (promptMessage?: string): Promise<boolean> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage || `Xác thực bằng ${getBiometricLabel()}`,
        cancelLabel: 'Hủy',
        disableDeviceFallback: false,
        fallbackLabel: 'Dùng mật khẩu thiết bị',
      });
      return result.success;
    } catch (error) {
      console.error('❌ Lỗi xác thực sinh trắc học:', error);
      return false;
    }
  }, [getBiometricLabel]);

  // Bật / tắt sinh trắc học (yêu cầu xác thực khi bật)
  const toggleBiometric = useCallback(async (): Promise<boolean> => {
    if (!isAvailable) return false;

    if (!isEnabled) {
      // Đang tắt → muốn bật → yêu cầu xác thực trước
      const success = await authenticate('Xác thực để bật sinh trắc học');
      if (success) {
        await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
        setIsEnabled(true);
        return true;
      }
      return false;
    } else {
      // Đang bật → tắt
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'false');
      setIsEnabled(false);
      return true;
    }
  }, [isAvailable, isEnabled, authenticate]);

  // Kiểm tra + xác thực nếu đã bật (dùng cho splash screen)
  const checkAndAuthenticate = useCallback(async (): Promise<boolean> => {
    try {
      const stored = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      if (stored !== 'true') return true; // Chưa bật → cho qua luôn

      const available = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!available || !enrolled) return true; // Thiết bị không hỗ trợ → cho qua

      return await authenticate('Xác thực để mở CVision');
    } catch (error) {
      console.error('❌ Lỗi checkAndAuthenticate:', error);
      return false;
    }
  }, [authenticate]);

  return {
    isAvailable,
    biometricType,
    isEnabled,
    isLoading,
    authenticate,
    toggleBiometric,
    checkAndAuthenticate,
    getBiometricLabel,
    getBiometricIcon,
  };
}
